<div align="center">

# Controle de OS

Aplicação web em formato Kanban para organizar, acompanhar e compartilhar ordens de serviço.

[![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-Semântico-E34F26?logo=html5&logoColor=fff)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Responsivo-1572B6?logo=css3&logoColor=fff)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_·_Firestore_·_Hosting-FFCA28?logo=firebase&logoColor=000)](https://firebase.google.com/)

[Acessar demonstração](https://controle-de-os-ex.web.app) · [Ver código-fonte](https://github.com/igorcastroo/Controle-de-OS-EX)

</div>

## Sobre o projeto

O **Controle de OS** foi criado para centralizar o fluxo de atendimento de ordens de serviço em uma interface visual e objetiva. Cada OS percorre as etapas do processo em um quadro Kanban, com dados sincronizados em tempo real e acesso individual protegido por autenticação.

Além do gerenciamento diário, a aplicação permite gerar resumos filtrados para envio pelo WhatsApp, incluindo as observações registradas em cada atendimento.

## Funcionalidades

- Cadastro, edição, exclusão, arquivamento e restauração de OS;
- Quadro Kanban com movimentação de cards por arrastar e soltar;
- Colunas configuráveis por usuário, com nome, cor e ordem personalizados;
- Fluxo inicial com **Pendentes**, **Em Andamento**, **Conferir**, **Gerar EXE**, **Aguardando** e **Resolvido**;
- Classificação por prioridade e identificação da empresa;
- Histórico de observações com data de cadastro e última alteração;
- Pesquisa por número, empresa, descrição, prioridade, data e observação;
- Filtros por período e arquivamento em lote de OS resolvidas;
- Resumo para WhatsApp por status e período, com a OBS de cada OS;
- Importação de atendimentos e restauração de backup em TXT;
- Exportação completa dos dados em TXT;
- Autenticação com conta Google;
- Sincronização em tempo real com o Cloud Firestore;
- Migração de dados locais para a nuvem;
- Tema claro e escuro;
- Layout responsivo para diferentes tamanhos de tela.

## Tecnologias

| Tecnologia | Utilização |
| --- | --- |
| HTML5 | Estrutura semântica, formulários, diálogos e templates da interface |
| CSS3 | Layout responsivo, temas, componentes e identidade visual |
| JavaScript | Regras de negócio, eventos, filtros, importação e renderização do Kanban |
| ES Modules | Separação das responsabilidades da aplicação |
| Firebase Authentication | Login seguro com provedor Google |
| Cloud Firestore | Persistência e sincronização dos dados em tempo real |
| Firebase Hosting | Publicação e entrega da aplicação web |

## Arquitetura

O projeto utiliza JavaScript modular no navegador, sem framework de interface ou etapa obrigatória de build.

```text
Controle-de-OS-EX/
├── index.html          # Estrutura da interface
├── styles.css          # Estilos, temas e responsividade
├── app.js              # Inicialização e conexão entre funcionalidades
├── firestore.rules     # Regras de segurança do banco de dados
├── firebase.json       # Configuração de publicação
├── js/
│   ├── config.js       # Constantes e chaves de armazenamento
│   ├── state.js        # Criação do estado compartilhado
│   ├── elements.js     # Referências aos elementos da interface
│   ├── events.js       # Associação dos eventos às ações
│   ├── firebase.js     # Autenticação e acesso ao Firestore
│   ├── storage.js      # Persistência local
│   ├── domain/         # Regras de OS, diário, colunas, notas e leitores TXT
│   ├── features/       # Fluxos de cada funcionalidade e renderização
│   └── utils/dates.js  # Conversão e formatação de datas
├── tests/
│   ├── *.test.js       # Testes de regras, persistência e funcionalidades
│   ├── browser/        # Cenários completos no navegador
│   └── fixtures/       # Firebase simulado para testes
└── package.json        # Comandos de teste e análise estática
```

As funções em `domain/` tratam dados sem depender da interface ou do Firebase.
Os módulos de `features/` recebem estado, elementos, serviços e ações por parâmetro.
O `app.js` conecta essas ações antes de registrar os eventos e observar o login,
evitando importações circulares. As ações ficam restritas a essa instância da aplicação.
Para mudar um fluxo, procure seu módulo: `tickets`, `board`, `daily`, `fixed-notes`,
`workflow`, `filters`, `backup`, `whatsapp`, `auth` ou `theme`.

### Fluxo de dados

1. O usuário entra com uma conta Google.
2. As OS e a configuração de colunas do usuário autenticado são carregadas do Firestore em tempo real.
3. Alterações feitas no Kanban são persistidas localmente e sincronizadas com a nuvem.
4. Nome, cor e ordem das colunas são salvos sem alterar o status interno das OS existentes.
5. As regras do Firestore garantem que cada usuário acesse somente os próprios registros.

## Como executar localmente

### Pré-requisitos

- [Git](https://git-scm.com/);
- Um servidor HTTP local, como a extensão **Live Server** do VS Code ou o pacote `serve`;
- Node.js apenas se optar pelo comando `npx` abaixo.

### Instalação

```bash
git clone https://github.com/igorcastroo/Controle-de-OS-EX.git
cd Controle-de-OS-EX
npx serve .
```

Abra o endereço informado no terminal. O projeto precisa ser servido por HTTP para que o login com Google funcione corretamente; abrir o `index.html` diretamente pelo sistema de arquivos não habilita a autenticação.

## Testes

Para desenvolver e executar a suíte, use Node.js 22 ou superior e instale as
dependências de desenvolvimento:

```bash
npm ci
npm test
npm run lint
npm run test:browser
```

- `npm test`: executa testes de OS, diário, colunas, notas, datas, backups,
  filtros, arquivamento e tratamento de falhas de persistência.
- `npm run lint`: detecta referências inexistentes, variáveis sem uso e erros
  estruturais nos módulos e testes.
- `npm run test:browser`: executa os fluxos da interface com Playwright, usando
  o Microsoft Edge instalado, sem abrir uma janela. O servidor local de testes
  é iniciado e encerrado automaticamente na porta 4173.
- `npm run test:coverage`: mostra a cobertura dos testes executados pelo Node;
  esse relatório não inclui os cenários do navegador.
- `npm run check`: executa análise estática, testes de regras e testes do navegador.

Os testes de navegador substituem somente o módulo Firebase por um backend em
memória. Eles não acessam contas reais nem gravam na produção. O login Google
real, as permissões do Firestore e a infraestrutura do Firebase precisam de
validação própria; não são cobertos por essa simulação.

Os testes usam dados fictícios. Dependências, arquivos de testes e relatórios
ficam fora da publicação no Firebase. A aplicação continua funcionando sem
compilação e sem dependências de produção do npm.

## Segurança e privacidade

Os registros são armazenados no caminho individual de cada usuário no Firestore. As regras em `firestore.rules` exigem autenticação e validam o identificador do usuário antes de permitir leitura ou escrita.

Backups exportados podem conter dados reais de atendimentos. Por isso, arquivos `controle-os-*.txt`, pacotes compactados, logs e outros arquivos temporários são ignorados pelo Git.

## Publicação

Com a [Firebase CLI](https://firebase.google.com/docs/cli) instalada e autenticada:

```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

## Competências demonstradas

- Desenvolvimento front-end com JavaScript puro e módulos ES;
- Modelagem e sincronização de dados com Firebase;
- Autenticação e controle de acesso por usuário;
- Manipulação de estado, eventos e interface responsiva;
- Implementação de importação, exportação e compatibilidade de dados;
- Organização de código por responsabilidade;
- Publicação de uma aplicação web funcional em ambiente de produção.

## Autor

Desenvolvido por [Igor Castro](https://github.com/igorcastroo).
