# Portfolio Management Application

Full-stack enterprise portfolio management system for investment themes, projects, resources, and financial tracking.

## Tech Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4 + Recharts + lucide-react
- **Backend:** Express.js 4 + better-sqlite3 (WAL mode, foreign keys enabled)
- **Monorepo:** npm workspaces, orchestrated with `concurrently`

## Commands

- `npm run dev` — Start both client (port 5173) and server (port 3001)
- `npm run build` — Production build (client only)
- `npm run seed` — Populate database with sample data
- `cd client && npm run lint` — Run ESLint

## Project Structure

```
client/src/
  components/   # Reusable UI components (PascalCase .jsx files)
  pages/        # Route-level page components
  hooks/        # useApi, useMutation
  api/          # HTTP client (client.js) — proxies /api to :3001
  utils/        # constants.js, formatters.js, calculations.js
  App.jsx       # Route definitions (React Router)

server/
  routes/       # Express routers (26 endpoint files)
  db/           # database.js (init), schema.sql (DDL)
  middleware/   # auth.js, errorHandler.js
  utils/        # auditLogger.js, automationEngine.js
  index.js      # Express app entry point
```

## Code Conventions

- **Components:** Functional components with hooks, no class components
- **Naming:** PascalCase files/components, camelCase functions/variables, UPPER_SNAKE_CASE constants
- **Styling:** Tailwind utility classes; custom theme vars in index.css
- **Icons:** lucide-react, 20-24px size
- **API responses:** `{ data }` on success, `{ error: { message } }` on failure
- **DB queries:** Prepared statements (prevent SQL injection)
- **Status enums:** Validated via CHECK constraints at the DB level

## Key Patterns

- Centralized color/status maps in `client/src/utils/constants.js`
- Polymorphic comments/audit (entity_type + entity_id)
- Audit logging tracks CREATE/UPDATE/DELETE with field-level changes
- User roles: Admin(5), PMO(4), PM(3), Executive(2), Viewer(1)
- Vite proxy forwards `/api` requests to the Express backend
