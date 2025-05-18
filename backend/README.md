# Back-end


## Requisitos

- Node.js 18+
- npm 9+ ou yarn
- MongoDB e Redis em execução (ou use Docker)

## Instalação

```bash
cd backend
npm install
```

## Comandos

### Rodar em modo desenvolvimento

```bash
npm run dev
```
O servidor será iniciado em [http://localhost:3000](http://localhost:3000)

---

### Rodar em modo produção

```bash
npm run build
npm start
```

---

### Testes

Executar todos os testes:

```bash
npm test
```

Executar testes com relatório de cobertura:

```bash
npm run test:coverage
```

---

### Lint (análise de código)

```bash
npm run lint
```

Corrigir problemas automaticamente:

```bash
npm run lint:fix
```

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend com essas variáveis.

```
JWT_SECRET=sua_senha_secreta
PORT=3000
```

---

OBS: Use algum gerador de Secret KEY, como: https://jwtsecret.com/generate

## Outras informações

- O entrypoint principal é `src/server.ts`.
- O projeto utiliza TypeScript, ESLint e Jest para testes.