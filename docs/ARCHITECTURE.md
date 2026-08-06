# System Architecture

The IT Support Ticketing System is a modern web application designed for performance, modularity, and scalability. It eschews heavy frontend frameworks in favor of a lightweight, highly controlled Vanilla TypeScript architecture, paired with a robust Node.js/Express backend.

## Architecture Philosophy

This document and the corresponding Architectural Decision Records (ADRs) represent the project's **current baseline, not immutable rules**. Our engineering philosophy is based on the following principles:

1. **Evolutionary Architecture**: Every major technology choice (frameworks, ORMs, deployment strategies, storage) is open to revision when there is a clear technical, operational, or business justification.
2. **Respect the Baseline, Evaluate Alternatives**: Future recommendations must respect the existing architecture by default, but should objectively evaluate alternatives when project requirements, team size, performance characteristics, maintainability, or operational needs change.
3. **Incremental Evolution Over Rewrites**: We prefer incremental improvements. Large migrations are only undertaken when the long-term benefits clearly outweigh the migration cost and risk.

The goal is to keep the project lightweight, scalable, and maintainable while remaining continuously open to adopting better technologies when justified by evidence. See [ADR 000: Architecture Philosophy](./DECISIONS.md) for more context.

---

## 1. Frontend Architecture

The frontend is a Single Page Application (SPA) built entirely in **Vanilla TypeScript** and bundled with **Vite**. 

### 1.1 Core Design Patterns
- **No-Framework Philosophy**: Components and Layouts are classes that generate DOM nodes via custom `createElement` utilities. This ensures zero framework overhead and fine-grained control over rendering.
- **Layout Management (`LayoutManager.ts`)**: The UI is divided into application shells (Admin Layout vs. Client Layout). The manager mounts the appropriate shell based on the user's role.
- **Page-Owned UI Composition**: Layouts act as generic skeletons. Individual pages are responsible for providing and injecting their own specific actions (e.g., "Create Ticket" buttons) into the layout's shared Topbar. This keeps layouts decoupled from page-specific business logic.
- **SPA Routing (`router.ts` & `pageLoader.ts`)**: Intercepts navigation, updates browser history, and dynamically mounts page modules (e.g., `TicketsPage`, `DashboardPage`) into the layout's content container.
- **State Management (`store.ts`)**: A centralized, event-driven pub/sub store manages global state (e.g., `currentUser`, `sessionToken`, active view). Components subscribe to state changes to update the DOM reactively.
- **Transitions (`TransitionManager.ts`)**: Uses the modern `View Transitions API` (`document.startViewTransition`) to provide seamless, native-app-like animations between route changes, falling back gracefully on unsupported browsers.

### 1.2 Authentication & Session Architecture
- **Hybrid Session Storage**: The frontend employs a dual-storage strategy. 
  - `sessionStorage` is used for active, ephemeral user sessions, isolating state per-tab.
  - `localStorage` is used exclusively to store long-lived tokens when the user selects "Remember Me".
  - **Per-Tab Restoration**: On application load, the system first checks `sessionStorage` to restore the active tab's session. If missing, it checks `localStorage` for a "Remember Me" token and automatically re-authenticates.

### 1.3 Data Communication
- **API Services (`api.ts`)**: Centralized wrapper around the native `fetch` API. Automatically injects JWT Bearer tokens, normalizes JSON responses, and throws structured `APIError` objects for consistent error handling.

---

## 2. Backend Architecture

The backend is a RESTful API built with **Node.js** and **Express.js**.

### 2.1 Layered Design
- **Routes (`routes/`)**: Defines API endpoints and attaches middleware.
- **Controllers (`controllers/`)**: Parses HTTP requests, validates DTOs, and formats HTTP responses.
- **Services (`services/`)**: Contains the core business logic (e.g., creating tickets, updating statuses, managing users).
- **Middleware (`middleware/`)**: Handles cross-cutting concerns like Authentication (`requireAuth`), rate-limiting (`express-rate-limit`), and global error catching.

### 2.2 Security
- **Authentication**: Stateless JWT tokens passed via the `Authorization: Bearer` header. Passwords are cryptographically hashed using `bcryptjs`.
- **Headers**: Secured against common vulnerabilities using `helmet`.

---

## 3. Database & Data Access

The system uses **PostgreSQL** as its primary data store.

### 3.1 Custom Query Wrapper
Instead of a heavy ORM (like Prisma) or a Query Builder (like Knex), the application uses the native `pg` driver wrapped by a custom utility (`backend/src/config/db.ts` and `backend/src/utils/dbParser.ts`).
- **Named Parameters**: Allows writing readable raw SQL (e.g., `SELECT * FROM users WHERE id = @id`).
- **Robust Parsing**: The parser safely ignores `@` symbols located inside string literals (`'...'`) and double-quoted identifiers (`"..."`), translating the rest into Postgres positional parameters (`$1, $2`).
- **Documented Limitations**: PostgreSQL dollar-quoted strings (`$$...$$`) and SQL comments (`--`, `/* */`) are intentionally unsupported to keep the parser lightweight. These boundaries are explicitly documented and enforced via automated regression tests.

---

## 4. Storage & Media

To support serverless environments, local file storage is strictly avoided.
- **File Uploads**: When a user attaches a file to a ticket, `multer` buffers it in memory.
- **Supabase Storage**: The buffer is immediately uploaded to a Supabase Storage bucket.
- **Delivery**: The backend serves file requests (`GET /uploads/:filename`) by redirecting the client to the public Supabase CDN URL, ensuring high availability and zero load on the Node server.

---

## 5. Deployment Infrastructure

The system employs a hybrid deployment strategy depending on the environment.

### 5.1 Local & Staging (Dockerized)
- Defined via `docker-compose.yml`.
- Spins up the Node backend, Vite frontend, and an Nginx reverse proxy.
- Nginx routes `/api/v1/*` and `/uploads/*` to the backend container, and everything else to the frontend container.

### 5.2 Production (Serverless)
- **Vercel**: Deploys the frontend as static CDN assets and the Express backend as Vercel Serverless Functions (via `vercel.json`).
- **Supabase PostgreSQL**: Acts as the remote database. The backend connects using the **Supabase IPv4 Connection Pooler** (port `6543`). This is critical because Vercel's ephemeral serverless functions can spawn hundreds of concurrent instances during cold starts; the connection pooler multiplexes these connections to prevent exhausting the Postgres database's native connection limits.
