# ADR 0004: Service Layer Conventions

## Status
Accepted

## Context
As the application grows, maintaining a clean boundary between UI components, state management, and the network layer becomes essential. In Phase 9, we centralized our API calls and error handling. To ensure this architecture remains consistent, we need strict rules governing how services interact with the rest of the application.

## Decision
All code within the src/services/ directory must adhere to the following architectural conventions:

1. **Services never access the DOM**: Services operate purely on data. They must not import DOM utilities, query the document, or interact with HTML elements.
2. **Services never mutate global state directly**: Services may read state (e.g., retrieving an auth token), but they must not write to or dispatch actions directly to the store. State mutation is the responsibility of the caller (pages, controllers, or dedicated thunks).
3. **Services return normalized domain objects**: Network responses should be parsed, validated, and returned as typed domain models (e.g., Ticket, User).
4. **Services throw only APIError**: Any HTTP failure or network exception must be caught and rethrown as an APIError, optionally containing a structured ErrorCode (e.g., UNAUTHORIZED, NETWORK). This ensures callers can rely on a consistent error shape.

## Consequences
- **Positive**: High testability, decoupled architecture, consistent error handling.
- **Negative**: Adds strict constraints on where side-effects can occur, requiring clear orchestration in UI or state layer.