import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import axe from 'axe-core';

// Start serve.mjs separately, then run: node previews/homepage/verify.mjs
// An optional first argument selects another local preview origin.
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../..');
const base = new URL(process.argv[2] || 'http://127.0.0.1:4186/');
assert(['127.0.0.1', 'localhost'].includes(base.hostname), 'Only local preview servers are allowed');
const results = [];
const productionFiles = ['index.html', 'assets/css/style.css', 'assets/js/app.js'];
const signature = async relative => {
  const filename = path.join(repository, relative);
  const [bytes, stat] = await Promise.all([fs.readFile(filename), fs.stat(filename)]);
  return {file: relative, size: stat.size, modifiedUtc: stat.mtime.toISOString(), sha256: createHash('sha256').update(bytes).digest('hex')};
};
const productionBefore = await Promise.all(productionFiles.map(signature));
const originalHtml = await fs.readFile(path.join(repository, 'index.html'), 'utf8');
const network = {externalRequests: [], failedResponses: [], failedRequests: [], consoleErrors: [], pageErrors: []};
const test = async (name, fn) => {
  try { const details = await fn(); results.push({name, status: 'passed', details}); console.log(`PASS ${name}`); }
  catch (error) { results.push({name, status: 'failed', error: error.message}); console.error(`FAIL ${name}: ${error.message}`); }
};
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--disable-extensions']});
const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
await context.route('**/*', route => {
  const request = route.request();
  if (new URL(request.url()).origin !== base.origin) {
    network.externalRequests.push({url: request.url(), method: request.method()});
    return route.abort();
  }
  assert(['GET', 'HEAD'].includes(request.method()), `Unexpected request method: ${request.method()}`);
  return route.continue();
});
const scan = async (page, label) => {
  await page.evaluate(axe.source);
  const result = await page.evaluate(async () => {
    const audit = await window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']}});
    return {violations: audit.violations.map(v => ({id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({target: n.target, failureSummary: n.failureSummary}))})), incomplete: audit.incomplete.map(v => ({id: v.id, nodes: v.nodes.map(n => n.target)})), passes: audit.passes.length};
  });
  if (result.violations.length) {
    const error = new Error(JSON.stringify(result.violations));
    error.audit = result;
    results.push({name: label, status: 'failed', details: result});
    console.error(`FAIL ${label}: ${JSON.stringify(result.violations)}`);
  } else {results.push({name: label, status: 'passed', details: result}); console.log(`PASS ${label}`);}
};
try {
  for (const filename of ['index.html', 'alternativa-a.html', 'alternativa-b.html']) {
    const page = await context.newPage();
    page.on('pageerror', error => network.pageErrors.push({page: filename, message: error.message}));
    page.on('console', message => {if (message.type() === 'error') network.consoleErrors.push({page: filename, message: message.text()});});
    page.on('response', response => {if (response.status() >= 400) network.failedResponses.push({page: filename, url: response.url(), status: response.status()});});
    page.on('requestfailed', request => network.failedRequests.push({page: filename, url: request.url(), error: request.failure()?.errorText}));
    await page.goto(new URL(filename, base).href, {waitUntil: 'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    await test(`${filename}: unique IDs and valid local links`, async () => {
      const data = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
        const localLinks = [...document.querySelectorAll('a[href]')].map(a => ({href: a.href, hash: a.hash})).filter(a => new URL(a.href).origin === location.origin);
        return {duplicates: ids.filter((id, i) => ids.indexOf(id) !== i), brokenFragments: localLinks.filter(a => new URL(a.href).pathname === location.pathname && a.hash && !document.getElementById(decodeURIComponent(a.hash.slice(1)))), localLinks};
      });
      assert.deepEqual(data.duplicates, [], 'Duplicate IDs');
      assert.deepEqual(data.brokenFragments, [], 'Broken fragment links');
      const checked = [];
      for (const href of new Set(data.localLinks.map(link => link.href.split('#')[0]))) {
        const response = await context.request.get(href);
        checked.push({url: href, status: response.status()});
        assert.equal(response.status(), 200, href);
      }
      return {localLinks: checked};
    });
    await test(`${filename}: images decode successfully`, async () => {
      const images = await page.evaluate(async () => {
        for (const image of document.images) image.loading = 'eager';
        return await Promise.all([...document.images].map(async image => {
          try {await image.decode();} catch {}
          return {src: image.currentSrc || image.src, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight};
        }));
      });
      assert(images.every(image => image.complete && image.width > 0 && image.height > 0), JSON.stringify(images));
      return images;
    });
    await test(`${filename}: no horizontal overflow at 320, 390, 768 and 1440px`, async () => {
      const measurements = [];
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({width, height: 1000});
        await page.evaluate(() => window.scrollTo(0, 0));
        const measurement = await page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth}));
        measurements.push(measurement);
        assert.equal(measurement.scrollWidth, width, JSON.stringify(measurement));
        assert(measurement.bodyScrollWidth <= width, JSON.stringify(measurement));
      }
      return measurements;
    });
    await scan(page, `${filename}: axe desktop baseline`);
    await page.setViewportSize({width: 390, height: 844});
    await scan(page, `${filename}: axe mobile baseline`);
    if (filename === 'index.html') {await page.close(); continue;}
    await test(`${filename}: mobile menu keyboard, Escape and link close`, async () => {
      const menu = page.locator('[data-menu-toggle]');
      assert(await menu.isVisible());
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      await menu.focus(); await page.keyboard.press('Enter');
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => !!document.activeElement.closest('#site-nav')), 'Tab must reach open navigation');
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      assert(await menu.evaluate(e => document.activeElement === e));
      await menu.press('Space');
      const firstLink = page.locator('#site-nav a').first();
      await firstLink.focus(); await page.keyboard.press('Enter');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      return {openedWithEnter: true, navigationReachableByTab: true, escapeRestoresFocus: true, closesOnSectionLink: true};
    });
    await test(`${filename}: FAQ opens and closes with keyboard`, async () => {
      const faq = page.locator('details').first();
      await faq.locator('summary').focus(); await page.keyboard.press('Enter');
      assert(await faq.evaluate(e => e.open)); assert(await faq.locator('p').isVisible());
      await page.keyboard.press('Space'); assert.equal(await faq.evaluate(e => e.open), false);
      return {items: await page.locator('details').count(), keyboardToggle: true};
    });
    await test(`${filename}: every WhatsApp contact has logo, highlight and recognizable label`, async () => {
      const links = await page.locator('a[href^="https://wa.me/"]').evaluateAll(elements => elements.map(e => {
        const icon = e.querySelector('img.wa-icon');
        return {href: e.href, classes: [...e.classList], label: e.getAttribute('aria-label') || e.textContent.trim(), icon: icon?.getAttribute('src'), iconDecorative: icon?.getAttribute('alt') === '', target: e.target, rel: e.rel};
      }));
      assert(links.length >= 4, 'Expected prominent WhatsApp links throughout each preview');
      for (const link of links) {
        const url = new URL(link.href);
        assert.equal(url.pathname, '/5521991326294'); assert.equal(url.search, '');
        assert(link.classes.includes('wa-cta'), JSON.stringify(link));
        assert.equal(link.icon, 'assets/whatsapp.svg', JSON.stringify(link));
        assert(link.iconDecorative, 'The logo is decorative beside its WhatsApp label');
        assert.match(link.label, /WhatsApp/iu);
        assert.equal(link.target, '_blank');
        assert(link.rel.split(/\s/u).includes('noopener') && link.rel.split(/\s/u).includes('noreferrer'));
      }
      return {links, externalLinksNotOpened: true};
    });
    await test(`${filename}: floating WhatsApp stays usable and bounded on mobile`, async () => {
      const floating = page.locator('a.wa-floating');
      assert.equal(await floating.count(), 1);
      const measurements = [];
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({width, height: 844});
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => !document.querySelector('.wa-floating').hidden);
        assert(await floating.isVisible());
        const measurement = await floating.evaluate(e => {
          const rect = e.getBoundingClientRect();
          const style = getComputedStyle(e);
          return {viewport: innerWidth, position: style.position, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height};
        });
        assert.equal(measurement.position, 'fixed');
        assert(measurement.left >= 0 && measurement.right <= width && measurement.top >= 0 && measurement.bottom <= 844, JSON.stringify(measurement));
        assert(measurement.width >= 44 && measurement.height >= 44, JSON.stringify(measurement));
        if (width <= 390) assert(measurement.width <= width * .65, 'The floating contact must leave most mobile content readable');
        measurements.push(measurement);
      }
      await page.setViewportSize({width: 390, height: 844});
      return measurements;
    });
    const quiz = page.locator('#diagnostico');
    const panes = quiz.locator('.quiz-step-pane');
    const result = quiz.locator('#quiz-result-pane');
    const share = quiz.locator('#btn-quiz-wa-submit');
    const activePane = () => quiz.locator('.quiz-step-pane:not([hidden])');
    const expectStep = async step => {
      assert.equal(await activePane().count(), 1, 'Exactly one question is visible');
      assert.equal(await activePane().getAttribute('data-step'), String(step));
      assert.match(await quiz.locator('#quiz-step-indicator').textContent(), new RegExp(`${step} de 4`, 'u'));
      assert.equal(await result.isVisible(), false);
      assert(await activePane().locator('.quiz-question-title').evaluate(e => document.activeElement === e), 'Question heading receives focus');
    };
    await test(`${filename}: original quiz questions and options are visible inline`, async () => {
      assert(await quiz.isVisible());
      assert.equal(await page.locator('dialog.diagnostic-dialog').count(), 0);
      assert.equal(await panes.count(), 4);
      assert(await panes.first().isVisible());
      assert.equal(await result.isVisible(), false);
      const comparison = await page.evaluate(html => {
        const source = new DOMParser().parseFromString(html, 'text/html');
        const normalize = value => value.replace(/\s+/gu, ' ').trim();
        const questions = root => [...root.querySelectorAll('.quiz-step-pane')].map(pane => ({
          step: pane.dataset.step,
          question: normalize(pane.querySelector('.quiz-question-title').textContent),
          options: [...pane.querySelectorAll('.quiz-opt-btn')].map(button => ({question: button.dataset.question, value: button.dataset.value, label: normalize(button.textContent)}))
        }));
        return {original: questions(source), preview: questions(document.querySelector('#diagnostico'))};
      }, originalHtml);
      assert.equal(comparison.original.length, 4, 'Original site must provide four quiz questions');
      assert.deepEqual(comparison.preview, comparison.original, 'Preview must preserve all original question text, option labels and data values');
      return {questions: comparison.preview, inlineByDefault: true};
    });
    await test(`${filename}: quiz entry points scroll to and focus the current question`, async () => {
      const triggers = page.locator('[data-diagnostic]');
      assert(await triggers.count() > 0);
      for (let index = 0; index < await triggers.count(); index++) {
        const trigger = triggers.nth(index);
        if (!await trigger.isVisible()) continue;
        await trigger.click();
        await expectStep(1);
        await page.waitForFunction(() => {
          const title = document.querySelector('.quiz-step-pane:not([hidden]) .quiz-question-title');
          const rect = title.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= innerHeight;
        });
      }
      return {triggers: await triggers.count(), questionFocusedAndInViewport: true};
    });
    await scan(page, `${filename}: axe inline quiz first step`);
    await test(`${filename}: floating contact leaves the visible quiz unobstructed`, async () => {
      await quiz.locator('#quiz-box').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.wa-floating').hidden);
      assert(await quiz.locator('.quiz-direct-contact.wa-cta').count() === 1);
      return {floatingHiddenWhileQuizVisible: true,inlineWhatsAppAvailable: true};
    });
    let chosenFirst;
    await test(`${filename}: quiz advances, goes back and preserves answer and progress`, async () => {
      const first = activePane().locator('.quiz-opt-btn').first();
      chosenFirst = {question: await first.getAttribute('data-question'), value: await first.getAttribute('data-value')};
      await first.click(); await expectStep(2);
      await activePane().locator('.js-quiz-back').click(); await expectStep(1);
      const selected = activePane().locator('.quiz-opt-btn[aria-pressed="true"]');
      assert.equal(await selected.count(), 1); assert.equal(await selected.getAttribute('data-value'), chosenFirst.value);
      await selected.click(); await expectStep(2);
      await page.locator('[data-diagnostic]:visible').first().click(); await expectStep(2);
      assert.equal(await panes.first().locator('.quiz-opt-btn[aria-pressed="true"]').getAttribute('data-value'), chosenFirst.value);
      assert.equal(new URL(await share.getAttribute('href')).search, '');
      assert.equal(await share.isVisible(), false);
      return {selectedAnswer: chosenFirst, backPreservesAnswer: true, returningToQuizPreservesStep: true};
    });
    const answers = [];
    await test(`${filename}: four-step completion creates the original WhatsApp payload without sending it`, async () => {
      answers.push(chosenFirst);
      for (let step = 2; step <= 4; step++) {
        await expectStep(step);
        assert.equal(await share.isVisible(), false);
        const option = activePane().locator('.quiz-opt-btn').nth(step === 2 ? 1 : 0);
        answers.push({question: await option.getAttribute('data-question'), value: await option.getAttribute('data-value')});
        await option.click();
      }
      assert.equal(await activePane().count(), 0);
      assert(await result.isVisible());
      assert(await result.locator('.quiz-question-title').evaluate(e => document.activeElement === e));
      assert.equal((await quiz.locator('#quiz-step-indicator').textContent()).trim(), 'Resumo pronto');
      const summary = await result.locator('#quiz-summary-list li').evaluateAll(items => items.map(item => ({question: item.querySelector('.k').textContent.replace(/:$/u, ''), value: item.querySelector('.v').textContent})));
      assert.deepEqual(summary, answers);
      const url = new URL(await share.getAttribute('href'));
      assert.equal(url.origin, 'https://wa.me'); assert.equal(url.pathname, '/5521991326294');
      const expected = 'Olá! Gostaria de uma avaliação técnica da TxJ Engenharia.\n\n' + answers.map(answer => `${answer.question}: ${answer.value}`).join('\n');
      assert.equal(url.searchParams.get('text'), expected);
      assert.deepEqual([...url.searchParams.keys()], ['text']);
      assert.equal(await share.getAttribute('rel'), 'noopener noreferrer');
      return {destination: `${url.origin}${url.pathname}`, answers, exactPayload: expected, linkNotOpened: true};
    });
    await scan(page, `${filename}: axe inline quiz result`);
    await test(`${filename}: quiz result responsive at 320, 390, 768 and 1440px`, async () => {
      const measurements = [];
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({width, height: 844});
        const measurement = await result.evaluate(e => ({width: innerWidth, clientWidth: e.clientWidth, scrollWidth: e.scrollWidth, left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right, pageScrollWidth: document.documentElement.scrollWidth}));
        assert(measurement.scrollWidth <= measurement.clientWidth, JSON.stringify(measurement));
        assert(measurement.left >= 0 && measurement.right <= width, JSON.stringify(measurement));
        assert.equal(measurement.pageScrollWidth, width, JSON.stringify(measurement));
        measurements.push(measurement);
      }
      return measurements;
    });
    await test(`${filename}: edit answers returns to step four and updates the result`, async () => {
      await result.locator('.js-quiz-back').click(); await expectStep(4);
      assert.equal(await activePane().locator('.quiz-opt-btn[aria-pressed="true"]').getAttribute('data-value'), answers[3].value);
      const replacement = activePane().locator('.quiz-opt-btn').last();
      answers[3] = {question: await replacement.getAttribute('data-question'), value: await replacement.getAttribute('data-value')};
      await replacement.click();
      assert(await result.isVisible());
      const expected = 'Olá! Gostaria de uma avaliação técnica da TxJ Engenharia.\n\n' + answers.map(answer => `${answer.question}: ${answer.value}`).join('\n');
      assert.equal(new URL(await share.getAttribute('href')).searchParams.get('text'), expected);
      return {stepFourPreserved: true, editedAnswer: answers[3], updatedPayload: true};
    });
    await test(`${filename}: restart clears answers, summary and prepared message`, async () => {
      await result.locator('.js-quiz-restart').click(); await expectStep(1);
      assert.equal(await quiz.locator('.quiz-opt-btn[aria-pressed="true"]').count(), 0);
      assert.equal(await quiz.locator('#quiz-summary-list li').count(), 0);
      assert.equal(new URL(await share.getAttribute('href')).search, '');
      assert.equal(await share.isVisible(), false);
      assert.equal(await activePane().locator('.js-quiz-back:visible').count(), 0);
      return {answersCleared: true, summaryCleared: true, sharingPayloadCleared: true};
    });
    await test(`${filename}: quiz state is not persisted after reload`, async () => {
      await activePane().locator('.quiz-opt-btn').first().click(); await expectStep(2);
      await page.reload({waitUntil: 'networkidle'});
      assert.equal(await activePane().getAttribute('data-step'), '1');
      assert.equal(await quiz.locator('.quiz-opt-btn[aria-pressed="true"]').count(), 0);
      assert.equal(await quiz.locator('#quiz-summary-list li').count(), 0);
      assert.equal(new URL(await share.getAttribute('href')).search, '');
      assert.equal(await result.isVisible(), false);
      return {freshFirstStep: true, noPreviousAnswers: true};
    });
    await page.close();
  }
  await test('All preview pages: no external requests, console errors or broken resources', async () => {
    for (const [key, value] of Object.entries(network)) assert.deepEqual(value, [], key);
    return network;
  });
} finally {
  await context.close(); await browser.close();
  const productionAfter = await Promise.all(productionFiles.map(signature));
  await test('Production HTML, CSS and JS unchanged throughout QA', async () => {
    assert.deepEqual(productionAfter, productionBefore);
    return productionAfter;
  });
  const report = {date: new Date().toISOString(), base: base.href, command: 'node previews/homepage/verify.mjs', scope: 'Local isolated visual prototypes only. No global build/test, external navigation, contact submission or publication.', browser: 'Installed Google Chrome (Playwright channel chrome)', limitations: ['Automated checks do not replace visual review, assistive-technology testing or real-device testing.', 'File preservation compares hashes and timestamps before and after this QA run; it does not establish the state before preview implementation.', 'External links were inspected but never opened.'], totals: {passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status === 'failed').length}, productionBefore, productionAfter, network, results};
  await fs.writeFile(path.join(directory, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.totals));
  if (report.totals.failed) process.exitCode = 1;
}
