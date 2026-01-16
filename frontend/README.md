# Frontend

## Requirements

- Node.js 18+
- npm 9+ or yarn

## Installation

```bash
cd frontend
npm install
```

## Scripts

### Run Development Server

```bash
npm run dev
```
Access: [http://localhost:5173](http://localhost:5173)

---

### Production Build

```bash
npm run build
```

Output files will be generated in the `dist/` directory.

---

### Preview Production Build

```bash
npm run preview
```
Access: [http://localhost:4173](http://localhost:4173)

---

### Code Linting

```bash
npm run lint
```

---

### Relay Code Generation

Whenever you modify GraphQL queries or the schema, execute:

```bash
npm run relay
```

This will generate and update artifacts in the `app/__generated__/` directory.

---

## Additional Information

- The GraphQL schema used by Relay is located at `frontend/schema.graphql`.
- The Relay configuration file is `relay.config.json`.
