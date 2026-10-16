import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// Keep both preview pages self-contained while sharing one static quiz fragment.
const root=path.dirname(fileURLToPath(import.meta.url));
const quiz=(await fs.readFile(path.join(root,'quiz-section.html'),'utf8')).trim();
for(const variant of ['a','b']){
  const file=path.join(root,`alternativa-${variant}.html`);
  let html=await fs.readFile(file,'utf8');
  const block=`<!-- shared-quiz:start -->\n${quiz}\n    <!-- shared-quiz:end -->`;
  if(html.includes('<!-- shared-quiz:start -->')){
    html=html.replace(/<!-- shared-quiz:start -->[\s\S]*?<!-- shared-quiz:end -->/,block);
  }else{
    const target=variant==='a'?'<section id="solucoes"':'<section class="b-services b-section"';
    if(!html.includes(target))throw new Error(`Quiz insertion point missing in ${file}`);
    html=html.replace(target,`${block}\n    ${target}`);
  }
  await fs.writeFile(file,html);
}
console.log('Quiz original sincronizado nas duas propostas.');
