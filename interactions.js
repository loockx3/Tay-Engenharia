/* Local visual prototypes. No analytics, submissions or persistent answer storage. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const whatsapp = 'https://wa.me/5521991326294';
  const menu = $('[data-menu-toggle]');
  const nav = menu && document.getElementById(menu.getAttribute('aria-controls'));
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    menu?.setAttribute('aria-expanded', 'false');
  };
  menu?.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a,button').forEach(item => item.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
      closeMenu();
      menu.focus();
    }
  });

  // Keep the production quiz's questions, answer state, summary and WhatsApp flow.
  function setupQuiz() {
    const section = $('#diagnostico.homepage-quiz');
    if (!section) return;
    const panes = $$('.quiz-step-pane', section);
    const result = $('#quiz-result-pane', section);
    if (!panes.length || !result) return;
    const answers = Array(panes.length).fill(null);
    const options = new WeakMap();
    panes.forEach((pane, index) => $$('.quiz-opt-btn', pane).forEach(button => {
      options.set(button, {index, question: button.dataset.question, value: button.dataset.value});
      button.setAttribute('aria-pressed', 'false');
    }));
    let current = 0;
    const focusQuestion = (reveal = true) => {
      const title = $('.quiz-question-title', result.hidden ? panes[current] : result);
      title.focus({preventScroll: true});
      if (reveal) title.scrollIntoView({behavior: 'instant', block: 'nearest'});
    };

    function show(index, focus = true) {
      current = index;
      panes.forEach((pane, i) => {
        pane.hidden = i !== current;
        pane.classList.toggle('active', !pane.hidden);
        $$('.quiz-opt-btn', pane).forEach(button => {
          const selected = answers[i]?.value === options.get(button).value;
          button.classList.toggle('selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
      });
      result.hidden = current !== panes.length;
      result.classList.toggle('active', !result.hidden);
      $('#quiz-step-indicator', section).textContent = result.hidden ? `Passo ${current + 1} de ${panes.length}` : 'Resumo pronto';
      $('#quiz-progress-fill', section).dataset.step = String(current + 1);
      if (!result.hidden) {
        const list = $('#quiz-summary-list', section);
        list.replaceChildren();
        for (const answer of answers) {
          const item = document.createElement('li');
          const key = document.createElement('span');
          const value = document.createElement('span');
          key.className = 'k';
          value.className = 'v';
          key.textContent = `${answer.question}:`;
          value.textContent = answer.value;
          item.append(key, value);
          list.append(item);
        }
        const url = new URL(whatsapp);
        url.searchParams.set('text', 'Olá! Gostaria de uma avaliação técnica da TxJ Engenharia.\n\n' + answers.map(answer => `${answer.question}: ${answer.value}`).join('\n'));
        $('#btn-quiz-wa-submit', section).href = url.href;
      }
      if (focus) focusQuestion();
    }

    $$('.quiz-opt-btn', section).forEach(button => button.addEventListener('click', () => {
      const choice = options.get(button);
      if (choice.index !== current || panes[current].hidden) return;
      answers[current] = choice;
      show(current + 1);
    }));
    $$('.js-quiz-back', section).forEach(button => button.addEventListener('click', () => show(Math.max(0, current - 1))));
    $$('.js-quiz-restart', section).forEach(button => button.addEventListener('click', () => {
      answers.fill(null);
      $('#quiz-summary-list', section).replaceChildren();
      $('#btn-quiz-wa-submit', section).href = whatsapp;
      show(0);
    }));
    $$('[data-diagnostic]').forEach(trigger => trigger.addEventListener('click', event => {
      event.preventDefault();
      closeMenu();
      focusQuestion(false);
      $('#quiz-box', section).scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
    }));
    show(0, false);
    $$('button[disabled]', section).forEach(button => { button.disabled = false; });
    // The inline contact remains available while the floating shortcut stays off the answers.
    const floating = $('.wa-floating');
    if (floating && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        floating.hidden = entries[0].isIntersecting && document.activeElement !== floating;
      });
      observer.observe($('#quiz-box', section));
    }
  }

  setupQuiz();
})();
