# Architectural Decision Records (ADR)

This document records the major architectural decisions made during the lifecycle of the Ticketing System.

---

## ADR 000: Architecture Philosophy and Continuous Evolution

**Status**: Accepted  
**Date**: July 2026  

### Context
As a project grows, early architectural decisions can inadvertently become treated as immutable dogma, stifling innovation and preventing the adoption of better tools when project requirements change. We need a foundational rule for how architectural decisions are treated.

### Decision
We treat the Architecture and all ADRs as the project's **current baseline**, not permanent rules. 
- Decisions are evolutionary and open to revision with clear technical, operational, or business justification.
- Future work must respect the existing architecture by default but objectively evaluate alternatives when circumstances change.
- We favor incremental evolution over unnecessary large-scale rewrites. Large migrations must demonstrate that long-term benefits clearly outweigh migration costs and risks.

### Consequences
- **Positive**: Prevents technology stagnation. Empowers the team to adopt better tools when evidence justifies it, while safeguarding against "hype-driven" rewrites through the requirement of clear justification and preference for incremental evolution.
- **Negative**: Requires ongoing discipline to balance respecting the current baseline with objectively evaluating new alternatives.

---

## ADR 001: Vanilla TypeScript for Frontend Architecture

**Status**: Accepted  
**Date**: July 2026  

### Context
The previous architecture consisted of legacy, monolithic JavaScript files that were difficult to maintain. When upgrading, the team needed to decide between adopting a heavy component framework (React, Vue) or sticking to native browser technologies.

### Decision
The frontend is built entirely using **Vanilla TypeScript**. We use custom DOM utilities (`createElement`), a centralized state pub/sub store, and modular class-based components.

### Consequences
- **Positive**: Extremely lightweight bundle sizes, zero framework lifecycle overhead, and fine-grained control over DOM manipulations.
- **Negative**: Requires manual DOM teardown (event listeners) to prevent memory leaks, and lacks the vast third-party component ecosystems of React/Vue.

---

## ADR 002: Custom SQL Parameter Wrapper Over ORMs

**Status**: Accepted  
**Date**: July 2026  

### Context
Writing raw SQL strings with PostgreSQL positional parameters (`$1, $2`) is error-prone when query complexity increases. ORMs (Prisma, TypeORM) or Query Builders (Knex, Kysely) were considered.

### Decision
We implemented a custom, lightweight wrapper (`backend/src/utils/dbParser.ts`) around the native `pg` driver. It allows named parameters (`@id`, `@name`) to be automatically converted to positional parameters. 

### Consequences
- **Positive**: Preserves the raw performance and readability of pure SQL without the heavy abstraction layer or package bloat of an ORM.
- **Negative**: The parser intentionally does not support PostgreSQL dollar-quoted strings (`$$...$$`) or SQL comments (`--`, `/* */`) to maintain a lightweight footprint. These parser boundaries are explicitly documented and enforced via regression tests.

---

## ADR 003: View Transitions API for SPA Routing

**Status**: Accepted  
**Date**: July 2026  

### Context
A Single Page Application (SPA) can feel jarring during instant DOM replacements when switching pages.

### Decision
Implemented `TransitionManager.ts` which hooks into the modern browser `document.startViewTransition` API. 

### Consequences
- **Positive**: Provides native, app-like crossfade and transform animations between routes with minimal CSS.
- **Negative**: Only supported in modern Chromium-based browsers; degrades gracefully to instant transitions on unsupported browsers.

---

## ADR 004: Supabase Storage for Serverless File Uploads

**Status**: Accepted  
**Date**: July 2026  

### Context
The backend is designed to be deployed on Vercel as Serverless Functions. Serverless environments are ephemeral and read-only, meaning local file uploads (e.g., saving to a `/uploads` folder on disk) will fail in production.

### Decision
File uploads are handled entirely in memory (`multer.memoryStorage()`) and streamed directly to a **Supabase Storage** bucket via the Supabase JS SDK.

### Consequences
- **Positive**: Highly scalable, completely stateless backend, and attachments are delivered rapidly via the Supabase CDN.
- **Negative**: Increased network latency during the initial upload step as the file travels from Client -> Vercel Backend -> Supabase Storage.

---

## ADR 005: Hybrid Session Storage for Authentication

**Status**: Accepted  
**Date**: July 2026  

### Context
The application needs secure session management that survives page reloads but doesn't persist forever unless the user explicitly opts in.

### Decision
We implemented a hybrid session storage architecture. `sessionStorage` is used for active, ephemeral sessions to isolate state on a per-tab basis. `localStorage` is exclusively used to securely store a long-lived token when the user checks "Remember Me". The application restores sessions per-tab on load.

### Consequences
- **Positive**: Provides a secure default (ephemeral per-tab sessions) while cleanly supporting persistent sessions without polluting global browser state unnecessarily.
- **Negative**: Marginally increases the complexity of the frontend initialization logic.

---

## ADR 006: Page-Owned UI Composition

**Status**: Accepted  
**Date**: July 2026  

### Context
Layouts (Admin, Client) share common UI elements like the Topbar, but different pages require different actions (e.g., "Create Ticket" button on the Tickets page, but not on the Dashboard).

### Decision
Layouts act as generic, dumb skeletons. Individual pages inject their specific actions into the shared Layout components (like the Topbar) during their `load()` cycle.

### Consequences
- **Positive**: Strongly decouples the generic layout structure from page-specific business logic.
- **Negative**: Requires pages to explicitly clear or re-inject actions when navigating, which is handled automatically by the routing lifecycle.
