# ADR 0003: DOM Component Lifecycle

## Status
Accepted

## Context
As we migrate toward complex, interactive DOM components built with our `dom.ts` utilities (Phase 8 and beyond), we risk creating monolithic functions where DOM creation, state binding, and event listener attachment are heavily intertwined. This makes components difficult to test, reuse, and safely unmount, potentially leading to memory leaks and orphaned event listeners.

## Decision
We establish a standardized lifecycle convention for all complex, stateful DOM components. Components should be modeled as classes or structured object factories that implement the following lifecycle phases:

1. **`create()`**: Assembles the DOM tree using `createElement` without attaching it to the document or binding live data.
2. **`render(container: HTMLElement)`**: Attaches the component's root element to the specified container in the DOM.
3. **`attachEvents()`**: Binds event listeners to the component's elements. References to handler functions should be retained if they need to be removed later.
4. **`destroy()`**: Removes the component from the DOM, unbinds all event listeners, and cleans up any subscriptions (e.g., store listeners, timeouts).

## Consequences
- **Positive**: Consistent, predictable structure for component initialization and teardown. Prevents memory leaks by explicitly separating event binding and unbinding. Eases debugging and testing.
- **Negative**: Requires slightly more boilerplate compared to ad-hoc, inline function closures.
