# Changelog

All notable changes to the IT Support Ticketing System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **Documentation**: Created `docs/` folder containing detailed system documentation (`ARCHITECTURE.md`, `ROADMAP.md`, `DECISIONS.md`, `BACKLOG.md`, `CHANGELOG.md`).
- **Database Utilities**: Added `backend/src/utils/dbParser.ts`, a robust utility for parsing and translating named SQL parameters (`@param`) into PostgreSQL positional parameters (`$1`).
- **Regression Tests**: Added a comprehensive automated test suite (`dbParser.test.ts`) covering normal behaviors, legacy array placeholders, string literal edge cases, and known limitations (dollar-quotes and comments).

### Changed
- **API Error Handling Standardization**: Created centralized error extraction and notification helpers (`getErrorMessage` and `handleUIError`) in `frontend/src/utils/errorHandler.ts` to eliminate duplicate error boilerplate across pages and modals.
- **Route Registry Refactor**: Refactored `frontend/src/pageLoader.ts` to replace the growing `switch` statement with a compile-time type-safe `routeRegistry` dictionary (`Record<HtmlViewName, RouteHandler>`).
- **Frontend Architecture**: Completed the massive migration from a legacy monolithic JavaScript file structure to a highly modular, decoupled Vanilla TypeScript architecture built with Vite.
- **Database Configuration**: Updated `db.ts` to utilize the new decoupled `dbParser.ts` utility without altering the public `db.query` API.

### Fixed
- **Robustness**: Fixed a critical bug in the custom database wrapper where `@param` tokens located inside SQL string literals (`'...'`) and double-quoted identifiers (`"..."`) were incorrectly replaced, causing PostgreSQL parameter count mismatch errors and query crashes.
