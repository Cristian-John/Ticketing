# Project Roadmap

This roadmap outlines the strategic direction for the IT Support Ticketing System, categorized into immediate engineering priorities and long-term architectural evolution.

> **Note**: For the product and feature milestone timeline (e.g., Real-Time Notifications, Analytics, Workflow), please refer to the [Feature Roadmap](./FEATURE_ROADMAP.md).

---

## Phase 1: Pre-Production & Stabilization (Current)
*Focus: Refactoring technical debt, hardening the architecture, and preparing the codebase for an initial production launch.*

- [x] Migrate from legacy monolithic JavaScript to modular Vanilla TypeScript.
- [x] Secure the custom SQL database parser against string literal interpolation bugs.
- [x] Configure serverless-ready file uploads (Supabase Storage).
- [x] **Error Handling Standardization**: Centralized error message extraction and UI toast handling in `errorHandler.ts` across all frontend components.
- [x] **Route Registry Refactor**: Transitioned `pageLoader.ts` from a monolithic `switch` statement into a scalable compile-time type-safe dictionary Route Registry.
- [ ] **Singleton Decoupling**: Evaluate reducing tight coupling in `LayoutManager` to improve testability and modularity.

---

## Phase 2: Initial Production Launch
*Focus: Finalizing environments, CI/CD, and monitoring.*

- [ ] Finalize Vercel and Supabase production environment variables.
- [ ] Ensure the default Admin account seeding (`seedAdmin`) triggers correctly in the production environment without race conditions.
- [ ] Implement basic production logging and error monitoring tracking.

---

## Phase 3: Platform Evolution (Long-Term Vision)
*Focus: Scaling the engineering team and separating concerns by splitting the current Monorepo.*

**Note:** This repository split is part of the long-term architectural vision and is strictly not planned before the initial production release.

As the platform grows, maintaining a single repository for all contexts will become a bottleneck. The architecture is planned to evolve into distinct, independently deployable repositories:

1. **Ticketing-Backend**
   - The core Express API, Authentication, Database interactions, and third-party integrations (e.g., Slack, Email).
   - Serves as the single source of truth for all clients.

2. **Ticketing-Frontend**
   - The internal ticketing application SPA.
   - Contains the Admin Portal, IT Support Portal, and Client Portal.

3. **Ticketing-Website**
   - A statically generated site (e.g., Next.js or Astro).
   - Houses the public landing page, product marketing, pricing plans, and documentation.

4. **Ticketing-Mobile**
   - A React Native mobile application for IT technicians on the go, directly consuming the `Ticketing-Backend` API.
