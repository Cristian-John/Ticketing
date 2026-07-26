# ADR 0001: Frontend Styling Architecture

## Status
Accepted

## Context
Our monolithic style.css grew unwieldy, containing global tokens, layout styles, component styles, and page-specific rules all in one place. We needed a scalable way to maintain CSS without introducing complex build tooling or breaking the existing functional footprint.

## Decision
We decided to implement a modular CSS architecture relying on standard CSS @import mechanisms and structured into a strict dependency hierarchy:

1. **Core**: CSS Variables, Resets, and Global Utilities.
2. **Layout**: Structural application layouts (Shell, Sidebar, Topbar).
3. **Components**: Shared, reusable UI widgets (Buttons, Modals, Cards, Forms).
4. **Pages**: Screen-specific styling that is not reusable.

We chose *not* to introduce CSS Modules, Tailwind, or styled-components because:
- The application currently relies on a vanilla DOM-based component paradigm.
- Standard CSS @import works seamlessly with Vite.
- We wanted to achieve modularity with 0% functional change and minimal regression risk.

## Consequences
- **Positive**: High readability, easy navigation, and clear responsibility boundaries. No new build dependencies required.
- **Negative**: Without CSS Modules, we still rely on strict naming conventions (BEM-inspired) to prevent global scope pollution.
