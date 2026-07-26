# ADR 0005: State Management Conventions

## Status
Accepted

## Context
In Phase 10, we dramatically simplified our global store by removing duplicated caches (tickets, articles, stats, filters). Moving forward, we need explicit guidelines to prevent global state bloat and maintain a predictable application architecture.

## Decision
We establish the following state ownership and update rules:

1. **Global vs Local Ownership**: 
    - **Global State**: Only data required across the entire application lifecycle belongs in global state. Currently, this is limited to `currentUser` (Auth) and `currentView` (Routing/Navigation).
    - **Local State**: Component-specific data, such as fetched resources (e.g., ticket lists, dashboards), active UI filters, and form inputs, must be managed locally within the respective Page or Component. The DOM itself may serve as the source of truth for ephemeral UI state (like active tabs or filter selections).
2. **Immutable Updates**: When updating global state, favour immutable state replacement over in-place mutation. Although our current store is simple, treating state objects as immutable ensures safer, predictable updates should the application scale or integrate complex reactive frameworks in the future.

## Consequences
- **Positive**: Prevents "cache invalidation" bugs by fetching fresh data locally. Ensures components are independent and portable. Keeps the global store extremely lightweight.
- **Negative**: Components might fetch the same data consecutively if navigating back and forth rapidly, requiring deliberate performance optimizations (e.g., local caching or query abstractions) if it becomes an issue later.
