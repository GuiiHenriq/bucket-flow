# Backend

## Requirements

- Node.js 18+
- npm 9+ or yarn
- MongoDB and Redis running (or use Docker)

## Installation

```bash
cd backend
npm install
```

## Scripts

### Run Development Server

```bash
npm run dev
```
The server will start at [http://localhost:3000](http://localhost:3000)

---

### Run Production Build

```bash
npm run build
npm start
```

---

### Testing

Run all tests:

```bash
npm test
```

Run tests with coverage report:

```bash
npm run test:coverage
```

---

### Code Linting

```bash
npm run lint
```

Fix issues automatically:

```bash
npm run lint:fix
```

---

## Environment Variables

Create a `.env` file in the backend root directory with the following variables:

```
JWT_SECRET=token
PORT=3000
```

---

**Note:** Use a secret key generator, such as: https://jwtsecret.com/generate

## Additional Information

- The main entry point is `src/server.ts`.
- The project uses TypeScript, ESLint, and Jest for testing.