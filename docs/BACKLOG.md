# Backlog

This backlog tracks outstanding engineering tasks, technical debt, and feature requests.

---

## High Priority

*(All current High Priority Phase 1 items have been completed!)*

---

## Medium Priority

### 3. Setup Transactional Email Provider
**Component**: Backend (`services/emailService.ts`)
**Description**: Password recovery (Feature v1.4) will require the ability to send secure, transactional emails with reset links.
**Action**: Select and integrate a lightweight email provider (e.g., Resend, SendGrid) and establish secure environment variables for API keys.

### 4. Application-Level RBAC Middleware Design
**Component**: Backend (`middleware/rbac.ts`)
**Description**: The upcoming IT Support Workflow (Feature v1.5) will introduce complex role-based permissions (view, claim, transfer).
**Action**: Draft an ADR and design a middleware pattern for declarative role and ownership checks on Express routes before implementing the feature.

### 5. Vercel Serverless Function Optimization
**Component**: Backend (`vercel.json`)
**Description**: Ensure that the Express application is properly optimized for cold starts on Vercel.
**Action**: Verify that the database connection pool in `db.ts` is managed correctly across ephemeral serverless invocations to prevent connection leaks.

### 6. Dev Server Tooling
**Component**: Backend (`package.json`)
**Description**: The current `ts-node src/server.ts` setup lacks hot-reloading, making development cumbersome.
**Action**: Evaluate and implement tools such as `tsx watch`, `nodemon`, or `ts-node-dev` after this milestone to improve the backend development experience.

---

## Low Priority

### 6. Decouple LayoutManager Singletons
**Component**: Frontend (`LayoutManager.ts`)
**Description**: The `LayoutManager` currently holds static references to the `AdminLayout` and `ClientLayout`. This tight coupling binds layout instances to global state.
**Action**: Evaluate if passing layout containers via dependency injection (or initializing them on-demand inside the router) provides a measurable improvement in modularity or testability.

### 7. Knowledge Base Search Indexing
**Component**: Backend (`articles.ts` route)
**Description**: The current article search relies on basic SQL `ILIKE` queries.
**Action**: Implement PostgreSQL Full-Text Search (`to_tsvector`) for faster, more relevant knowledge base querying.

---

## Deferred

### 8. Extend Custom SQL Parser Capabilities
**Component**: Backend (`dbParser.ts`)
**Description**: The current custom SQL parser intentionally ignores PostgreSQL dollar-quoted strings (`$$...$$`) and SQL comments (`--`, `/* */`) to maintain a lightweight footprint.
**Action**: Support for these syntax features may be evaluated in the future if increased parser complexity becomes justified by new backend requirements.
