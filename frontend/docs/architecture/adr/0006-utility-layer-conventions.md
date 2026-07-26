# ADR 0006: Utility Layer Conventions

## Status
Accepted

## Context
In Phase 11, we centralized our utility layer by consolidating constants, enumerations, configurations, and helper functions into `src/utils/`. To ensure this layer remains maintainable and predictable as the application grows, we need to establish strict boundaries regarding its responsibilities.

## Decision
We establish the following conventions for the utility layer:

1. **Stateless**: Utility functions must be pure functions where possible and must not hold internal state.
2. **No DOM Access**: Utilities (except for dedicated DOM helpers like `dom.ts` and `portalContent.ts`) should not directly access or manipulate the Document Object Model.
3. **No Global State Interaction**: Utilities must not import or interact with the global state store. Data should be passed to utilities as explicit arguments.
4. **No Network Requests**: Utilities must not perform API calls or network requests. This is strictly the responsibility of the service layer.
5. **Framework-Independent**: Utility logic should be written in standard TypeScript/JavaScript, remaining agnostic of any UI framework or library, ensuring portability.
6. **Domain Separation**: If files like `constants.ts` or `config.ts` grow substantially, they should be split into domain-specific modules (e.g., `constants/departments.ts`, `config/api.ts`).

## Consequences
- **Positive**: Utilities remain highly testable, predictable, and reusable. Circular dependencies are minimized.
- **Negative**: Certain conveniences (like a utility function fetching its own missing data) are disallowed, requiring slightly more explicit orchestration in the consumer (e.g., the page controllers).
