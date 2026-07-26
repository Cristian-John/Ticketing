# Responsive Strategy

This document outlines the responsive strategy for the Version 1.1 frontend architecture, detailing breakpoint definitions, philosophy, and layout adaptation guidelines.

## Philosophy
The application follows a **Mobile-First** responsive design approach. 
Because `style.css` has been decoupled from specific component implementation details, its primary CSS responsibility is orchestrating `@media` query breakpoints that apply global layout shifts (like sidebar collapsing or main container expanding).

## Breakpoint Definitions

The standard responsive breakpoints are maintained at the bottom of `src/style.css`.

- **Mobile (Max-Width: 768px)**
  - Targets mobile devices and small tablets.
  - Sidebar transitions to a hidden/overlay state.
  - Main content padding reduces.
  - Multi-column grids (like the Dashboard) stack vertically (e.g., `grid-template-columns: 1fr`).
  
- **Tablet / Small Desktop (Max-Width: 1024px)**
  - Targets tablets in landscape and smaller laptop screens.
  - Used for intermediate layout adjustments (e.g., transitioning complex data tables to scrollable containers).

## Layout Adaptation Guidelines

1. **Keep Breakpoints Centralized (Where Possible)**
   While specific page layouts (e.g., `dashboard.css`) may define their own media queries for component reflowing, overarching structural shifts (like the Shell and Sidebar) should remain in their respective Layout stylesheets (`shell.css`, `sidebar.css`).
   
2. **Component Fluidity**
   Shared components (buttons, cards, forms) should rely on flexible units (`%`, `vw`, `flex-wrap`) and `min-width`/`max-width` rather than fixed pixel widths. This reduces the number of media queries required to make a component responsive.
   
3. **Avoid Magic Numbers**
   Do not introduce arbitrary breakpoint values (e.g., `@media (max-width: 834px)`). Stick to the established 768px and 1024px breakpoints to maintain consistent behavior across the application.
