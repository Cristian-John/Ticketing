# CSS Component Naming Convention

To maintain consistency across the codebase as the collection of shared component stylesheets grows, we have established the following naming conventions for reusable CSS classes.

## Block-Element-Modifier (BEM) Inspired Standard
We follow a lightweight BEM-inspired approach to class naming to ensure styles remain predictable and isolated:

- **Block (.block)**: The root of the component (e.g., .btn, .modal, .badge).
- **Element (.block-element)**: A dependent child within the block (e.g., .modal-header, .modal-body).
- **Modifier (.block-modifier)**: A variation of the block (e.g., .btn-primary, .badge-severe).

## State Classes
Classes representing the state of a component should be prefixed or use standard state names:
- .is-active or .active`n- .is-hidden or .hidden`n- .is-loading`n
## Dependency Direction Rule
Component styles **must remain independent** of page-specific styles. The dependency flow must always remain:
1. **Core** (Variables, Resets)
2. **Layout** (Shell, Navigation)
3. **Components** (Forms, Buttons, Modals)
4. **Pages** (Login, Dashboard)

Do not tightly couple a component to a page (e.g., avoid .dashboard-page .btn). Components should govern themselves or rely on container structural queries where strictly necessary.

## Responsibility Boundaries: Shared vs. Page-Specific

To prevent duplicated styling and preserve our dependency direction, adhere to these strict boundaries:

**Shared Components (src/styles/components/)**:
- Must be reusable across multiple different screens (e.g., buttons, modals, input fields).
- Must **never** include margins or absolute positioning that dictates page layout (components should be structurally agnostic).
- Must not reference parent page classes (e.g., .login-page .btn-primary is forbidden).

**Page-Specific Styles (src/styles/pages/)**:
- Must contain styles unique to a single screen (e.g., a specific Dashboard grid, the Login form container structure).
- Are allowed to dictate margins, paddings, and layout wrappers for the components rendered within them.
- Should **not** redefine colors, typography, or states for a shared component. Use utility classes or modify the component globally if needed.

