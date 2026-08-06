# Behavioral Guidelines

- Do NOT run `git push` automatically after committing changes. Wait for explicit user confirmation before pushing any code to remote repositories.
- Do NOT merge into `main` automatically. All work must remain on the current working branch until the user explicitly approves the merge.
- Do not create monolithic modules, containers, or pages. Keep the codebase modular, cohesive, and easy to maintain.
- Temporary test files, QA scripts, migration scripts, architecture reports, and debugging artifacts should only exist while actively solving a problem. Remove them before completing the task unless the user explicitly requests they be retained.

---

# Decision-Making Guidelines

Before implementing any change:
1. Identify the root cause.
2. Consider at least two implementation approaches.
3. Explain why the selected approach is preferred.
4. Consider architectural impact.
5. Consider security impact.
6. Consider regression impact.

Do not implement the first solution found without evaluating alternatives.

---

# Security Guidelines

- Never expose credentials, secrets, API keys, access tokens, JWT secrets, database passwords, SSH keys, certificates, private keys, or sensitive environment variables in source code, documentation, screenshots, logs, reports, commits, or pull requests.
- Never hardcode secrets into the application. Always use environment variables or secure configuration mechanisms.
- Before completing any task, perform a security review of the modified code.

Check for:
- Hardcoded secrets
- Sensitive information committed accidentally
- Missing authorization checks
- Missing authentication checks
- Broken access control
- SQL Injection risks
- XSS risks
- CSRF risks (if applicable)
- Unsafe `innerHTML`
- Unsafe DOM manipulation
- Command injection
- Path traversal
- File upload vulnerabilities
- Sensitive information leaked in API responses
- Debug endpoints accidentally enabled
- Excessive logging of sensitive data

If any issue is found:
- Explain the risk.
- Fix it whenever possible.
- Report any remaining risks.

Never knowingly introduce a security regression.

---

# Architecture Guidelines

- Follow existing architectural patterns unless there is a strong technical reason to improve them.
- Prefer composition over duplication.
- Keep modules focused on a single responsibility.
- Avoid introducing global state unless absolutely necessary.
- Prefer event delegation for dynamically generated DOM.
- Reuse design tokens, utility functions, and shared components instead of duplicating logic.

---

# HTML Architecture Guidelines

- Keep index.html minimal.
- Avoid monolithic HTML files.
- Modularize reusable templates.
- Reuse shared layouts.
- Separate presentation from business logic.
- Prefer reusable template generators where appropriate.

---

# API Guidelines

- Keep API responses consistent.
- Validate all user input.
- Return appropriate HTTP status codes.
- Never expose stack traces.
- Never expose internal implementation details through API responses.

---

# Dependency Guidelines

- Do not introduce new dependencies unless they provide significant architectural or operational value.
- Before installing a package:
  - Check whether the functionality already exists in the project.
  - Prefer native browser APIs or existing utilities.
  - Explain why the dependency is necessary.
- Remove unused dependencies before completing the task.

---

# Performance Guidelines

When implementing new functionality:
- Avoid unnecessary DOM re-renders.
- Avoid duplicate API requests.
- Minimize layout shifts.
- Minimize repaint and reflow operations.
- Prefer lazy loading for heavy resources.
- Keep animations GPU-friendly by using opacity and transform.
- Never sacrifice responsiveness for visual effects.

---

# Logging Guidelines

- Remove temporary console.log statements before completing the task.
- Never log:
  - passwords
  - tokens
  - session IDs
  - API secrets
  - personal information
  - authentication responses

Production code should not contain debug logging.

---

# Documentation Guidelines

Whenever architecture, workflows, or public interfaces change:
- Update ADRs.
- Update developer documentation.
- Update API documentation when applicable.
- Remove obsolete documentation.

Documentation must remain synchronized with implementation.

---

# Quality Guidelines

Before considering a task complete:
- Ensure the project builds successfully.
- Ensure linting passes.
- Ensure existing automated tests pass.
- Ensure newly introduced functionality is tested.
- Ensure there are no console errors or warnings.
- Ensure there are no unused imports, variables, or dead code.

---

# Regression Rule

Whenever modifying existing functionality:
- First identify what existing features could be affected.
- Perform a targeted regression review of those features.
- Report any potential regressions before considering the implementation complete.

Never assume a localized change cannot affect other parts of the system.

---

# Verification Guidelines

Before declaring a task complete, verify:
- Functionality
- Performance
- Security
- Accessibility (where applicable)
- Responsiveness
- Regression impact

Document any assumptions, limitations, or known risks.

---

# Deployment Guidelines

- Never deploy automatically.
- Never push automatically.
- Never merge automatically.

Wait for explicit user approval before:
- merging branches
- deploying
- publishing releases
- modifying production configuration

---

# Completion Checklist

Rather than relying on memory, every completed task should verify:

- [ ] Build passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Security reviewed
- [ ] Performance reviewed
- [ ] Accessibility reviewed (where applicable)
- [ ] No dead code
- [ ] No temporary files
- [ ] Documentation updated
- [ ] Regression reviewed

---

# UI & Design Guidelines

- Do not use emojis (e.g., 🔴, 📬, ⚙️) as UI icons or graphical elements in the application.
- Always use actual icons (e.g., SVG, icon fonts, or an established component library) to ensure a consistent, enterprise-grade aesthetic across all platforms.
