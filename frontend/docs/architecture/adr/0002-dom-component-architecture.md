# ADR 0002: DOM Component Architecture

## Status
Accepted

## Context
The application relies heavily on vanilla DOM manipulation to render components and page content. Historically, components generated raw HTML strings and inserted them via `innerHTML`. This approach risks Cross-Site Scripting (XSS) vulnerabilities, complicates refactoring, and makes the code harder to test and trace. Furthermore, some utility functions (e.g., `portalContent.ts`) were tightly coupled to global state (`store.getState()`), making them impure and difficult to reuse.

## Decision
We decided to enforce a safer, structured DOM construction architecture by introducing a dedicated DOM utility (`src/utils/dom.ts`). 

1. **DOM Utility**: `createElement` provides a type-safe wrapper around `document.createElement`, allowing declarative assignment of `className`, `id`, `textContent`, `attributes`, and `children`.
2. **Eliminate `innerHTML`**: HTML string generation via `innerHTML` is strongly discouraged and explicitly removed from shared utilities like `portalContent.ts`.
3. **Decouple Global State**: Utilities must be pure functions. Any state required (such as the current user's role) must be passed as an argument rather than imported directly from the global store.

## Consequences
- **Positive**: Enhanced security by escaping text content natively. Cleaner, more predictable component construction. Utilities are now decoupled from the Redux-like global store, improving testability.
- **Negative**: Creating complex DOM trees requires more boilerplate compared to multi-line template literals.
