import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(root,'screenshots'),{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  for(const c of ['a','b']){
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    await page.goto('http://127.0.0.1:4186/alternativa-'+c+'.html');
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(root,'screenshots',c+'-desktop.png')});
    await page.screenshot({path:path.join(root,'screenshots',c+'-full.png'),fullPage:true});
    await page.locator('#diagnostico').screenshot({path:path.join(root,'screenshots',c+'-quiz-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(root,'screenshots',c+'-mobile.png'),fullPage:true});
    await page.screenshot({path:path.join(root,'screenshots',c+'-mobile-fold.png')});
    await page.locator('#diagnostico').screenshot({path:path.join(root,'screenshots',c+'-quiz-mobile.png')});
    await page.close();
  }
  const hub=await browser.newPage({viewport:{width:1440,height:1000}});
  await hub.goto('http://127.0.0.1:4186/');await hub.evaluate(()=>document.fonts.ready);
  await hub.screenshot({path:path.join(root,'screenshots','propostas.png'),fullPage:true});
  await hub.locator('.proposal-grid').screenshot({path:path.join(root,'screenshots','comparacao.png')});
  console.log('Capturas desktop, mobile e página de comparação prontas.');
}finally{await browser.close();}
