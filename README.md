# Controle de OS

Sistema simples em Kanban para controlar OS com 5 status:

- Pendentes
- Em Andamento
- Gerar EXE
- Aguardando
- Resolvido

## Como usar

Abra o arquivo `index.html` no navegador.

Os dados ficam salvos no `localStorage` do proprio navegador. Use **Exportar TXT** para gerar uma copia no formato de texto.

## Firebase

O sistema usa Firebase Authentication com Google e Cloud Firestore para sincronizar as OS. Ao entrar pela primeira vez, use **Migrar OS locais** para enviar ao Firestore as OS salvas neste navegador.

O login Google precisa que o sistema seja aberto por um endereco web, como GitHub Pages ou Firebase Hosting. Abrir o `index.html` diretamente pelo Windows nao permite autenticar.

### Regras de seguranca do Firestore

As regras ficam em `firestore.rules`: cada pessoa autenticada pode acessar somente
as OS do proprio usuario. Para publicar essa protecao no Firebase, instale a Firebase
CLI, faca login e execute, na pasta do projeto:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## Recursos

- Criar, editar e excluir OS
- Arrastar cards entre status
- Buscar por numero, empresa, descricao, prioridade e observacao
- Importar o TXT usado atualmente
- Exportar e restaurar um backup completo em TXT
- Tema claro/escuro

## Estrutura do codigo

- Padrao: modulos ES (ES Modules) no navegador, com responsabilidades separadas.
- `app.js`: interface, eventos e fluxos da aplicacao.
- `js/tickets.js`: criacao e normalizacao das OS.
- `js/storage.js`: persistencia local no navegador.
- `firebase.js`: autenticacao e sincronizacao com o Firestore.
