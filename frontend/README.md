# Front-end


## Requisitos

- Node.js 18+
- npm 9+ ou yarn

## Instalação

```bash
cd frontend
npm install
```

## Comandos

### Rodar o Front-end em modo desenvolvimento

```bash
npm run dev
```
Acesse: [http://localhost:5173](http://localhost:5173)

---

### Build de produção

```bash
npm run build
```

Os arquivos finais ficarão em `dist/`.

---

### Preview do build de produção

```bash
npm run preview
```
Acesse: [http://localhost:4173](http://localhost:4173)

---

### Lint (análise de código)

```bash
npm run lint
```

---

### Relay (gerar artefatos GraphQL)

Sempre que alterar queries ou o schema GraphQL, rode:

```bash
npm run relay
```

Isso irá gerar/atualizar os arquivos em `app/__generated__/`.

---

## Outras informações

- O schema GraphQL usado pelo Relay está em `frontend/schema.graphql`.
- O arquivo de configuração do Relay é `relay.config.json`.
