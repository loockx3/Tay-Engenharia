# TxJ Engenharia — duas alternativas para a homepage

Estudos visuais locais preparados em 15/10/2026 para escolher a direção antes de implementar o restante do site.

## Abrir

Abra `index.html` diretamente no navegador para comparar as duas propostas. Tudo que compõe as páginas é local: fontes, fotografias, estilos e interações.

Para visualizar por HTTP, execute a partir da raiz do projeto:

```powershell
node previews/homepage/serve.mjs
```

Acesse `http://127.0.0.1:4186/`. O servidor escuta somente em loopback e serve a pasta de prévias. Encerre com Ctrl+C.

- `alternativa-a.html`: **Clareza essencial**. Marfim, azul profundo e oliva, fotografia de arquitetura, serviços em linhas editoriais e tom consultivo.
- `alternativa-b.html`: **Precisão técnica**. Marinho, dourado e marfim, ilustração técnica original em SVG, composição institucional e processo em evidência.

Ambas incluem hero, serviços, processo, diagnóstico, FAQ e contato. Os menus mobile, âncoras, perguntas frequentes e questionário são funcionais. Os links de WhatsApp apontam ao número presente no site atual: +55 21 99132-6294. Nenhum contato é enviado automaticamente. Respostas ficam somente na memória da página e são mantidas ao navegar entre seções, mas não ao recarregar ou mudar de proposta.

## Escopo desta entrega

Somente arquivos novos em `previews/homepage/`. A homepage atual, seus assets, build, configurações de indexação e integrações de produção não foram modificados. Não houve publicação, migração, criação de páginas especializadas ou alteração de tecnologia. As prévias usam `noindex,nofollow` e não entram na lista de arquivos do build de produção existente.

O quiz original do site foi incorporado como seção visível logo após a apresentação principal de ambas as propostas. As quatro perguntas, os 16 textos/valores das opções, a navegação entre etapas e o resumo para compartilhar no WhatsApp foram preservados. Os atalhos para diagnóstico levam à seção sem apagar respostas. O questionário organiza o atendimento e não confirma regularidade nem substitui análise técnica. A integração de mensuração de produção permanece para a direção escolhida.

O WhatsApp ganhou o ícone já usado no site, cor verde com contraste adaptado a cada modelo, botões no cabeçalho/hero/contato e atalho flutuante. O telefone comercial não foi alterado. O atalho flutuante se oculta quando o card do quiz está visível, para não cobrir respostas; um botão de WhatsApp permanece na introdução da seção.

## Leitura inicial que orientou as propostas

O projeto atual é estático, em HTML/CSS/JavaScript, com fontes locais, imagens otimizadas, diagnóstico em quatro etapas e formulário que prepara um resumo para copiar no WhatsApp. Não há backend de captação implementado.

- **Prioridade visual alta:** o hero atual reúne título longo, catálogo no parágrafo, dois CTAs, quatro destaques e o questionário completo (`index.html`, aproximadamente linhas 340–418). As propostas reservam a primeira dobra para serviço, região e contato; o quiz aparece em uma seção própria logo abaixo da apresentação.
- **Prioridade de conteúdo alta:** o resumo do diagnóstico não confirma regularidade (`index.html`, aproximadamente linhas 495–497). As prévias explicam essa limitação antes e após o questionário.
- **Prioridade visual média:** a apresentação repete serviços logo após o hero e os cards usam padrões diferentes (`index.html`, aproximadamente linhas 523–535 e 682–724). As duas propostas reorganizam a leitura e tornam os acessos consistentes.
- **Prioridade de verificação alta para a fase seguinte:** relatórios de setembro afirmam ausência de solicitações externas, mas a fonte atual carrega Google Ads no head (`index.html`, linhas 6–7). As notas históricas não foram usadas como resultado destas propostas.
- **Dependências de conteúdo:** CNPJ, registros, profissionais, depoimentos e casos autorizados não foram fornecidos como evidência verificável. Não foram inventados, nem apresentados como prova comercial nas prévias.

Esta é a leitura inicial necessária à escolha visual. Não equivale à auditoria completa de SEO, concorrentes, Search Console, normas, hospedagem ou mensuração solicitada no briefing maior. Essas etapas permanecem para a reformulação após a escolha.

## Fotografias e ilustração

A fotografia da alternativa A é uma referência arquitetônica, não um projeto da TxJ, e isso está indicado na página. Autor, origem e licença estão em `assets/imagem-fachada-fonte.md`. A fotografia inicial não utilizada está documentada em `assets/imagem-fonte.md`.

O edifício em SVG da alternativa B é uma ilustração conceitual original; não constitui projeto executivo, desenho de segurança validado nem caso real. Marcas e fontes foram reaproveitadas do projeto; licenças de fontes acompanham os arquivos.

O HTML compartilhado do quiz fica em `quiz-section.html`. Após editá-lo, execute `node previews/homepage/sync-quiz.mjs` para atualizar as duas páginas, que continuam funcionando diretamente no navegador sem um servidor de templates.

## Verificação

`verify.mjs` verifica comportamento e acessibilidade em Chrome com Playwright e axe, usando as dependências já instaladas na raiz. Com o servidor ativo, execute:

```powershell
node previews/homepage/verify.mjs
node previews/homepage/capture.mjs
```

Resultado desta revisão: **47 verificações passaram e nenhuma falhou**. A verificação cobre larguras de 320, 390, 768 e 1440 px, navegação por teclado, diagnóstico e axe nos estados testados. Sem erros de execução, recursos quebrados ou solicitações externas durante os testes. Os resultados desta rodada ficam em `validation.json`, e as capturas desktop/mobile em `screenshots/`. Não se trata de certificação integral WCAG nem de medição de Core Web Vitals em produção. Não foram enviados leads ou acessadas contas.

## Próxima decisão

Escolher A, B ou uma combinação específica. Depois, revisar conteúdo e provas institucionais, concluir a auditoria completa e definir a arquitetura das páginas especializadas. A escolha visual, por si só, não autoriza publicação em produção.

