# Product Evolution Roadmap

This document outlines the planned feature milestones and product evolution for the IT Support Ticketing System. 

Unlike the Engineering Roadmap (`ROADMAP.md`), which focuses on infrastructure and technical debt, this roadmap is driven by product features and user capabilities. The implementation order has been intentionally structured based on architectural dependencies and risk mitigation rather than strictly following semantic version numbers chronologically.

---

## 1. Authentication & Password Recovery (v1.4)
**Purpose**: Complete the authentication lifecycle by allowing users to securely recover lost passwords.
**Benefits**: Reduces manual admin intervention for password resets; improves user autonomy.
**Dependencies**: Requires integration with an email service provider (e.g., Resend, SendGrid) for transactional emails.
**Complexity**: Low
**Preferred Architecture / ADRs**: Standard backend service integration. No new ADR anticipated.

## 2. IT Support Workflow (v1.5)
**Purpose**: Introduce core operational capabilities for the IT Support team, including claiming tickets, assigning to peers, and updating advanced statuses.
**Benefits**: Essential for multi-agent support teams to manage and collaborate on ticket resolution.
**Dependencies**: None.
**Complexity**: Medium
**Preferred Architecture / ADRs**: Standard REST CRUD operations leveraging the existing Express/Postgres architecture.

## 3. Authorization & RBAC (v1.5.1 - Architecture Prerequisite)
**Purpose**: Formalize Role-Based Access Control (RBAC) to securely manage who can view, claim, transfer, or close specific tickets.
**Benefits**: Secures the system as workflows become more complex, preventing privilege escalation or unauthorized data access.
**Dependencies**: Must follow or coincide with the IT Support Workflow (v1.5) as the workflows introduce complex permissions.
**Complexity**: Medium
**Preferred Architecture / ADRs**: 
- **Application-Level Enforcement**: We will tentatively plan to enforce RBAC via Express middleware and service-layer checks rather than Database-Level RLS (Row Level Security). This keeps business logic centralized in the Node backend.
- *Requires a dedicated ADR prior to implementation to define the permission model and middleware strategy.*

## 4. Analytics & Reporting (v1.8)
**Purpose**: Provide dashboards and reports on ticket volume, resolution times, agent performance, and system health.
**Benefits**: High business value for management to monitor SLAs and team efficiency.
**Dependencies**: Relies heavily on the data structures introduced in the IT Support Workflow (v1.5).
**Complexity**: Medium (primarily complex SQL aggregations).
**Preferred Architecture / ADRs**: Will query the existing operational database. If data volume grows significantly over time, an ADR evaluating read-replicas or data warehousing may be required, but it is not needed initially.

## 5. Ratings & Feedback (v1.7)
**Purpose**: Allow end-users to rate the support they received upon ticket resolution.
**Benefits**: Provides qualitative metrics to complement the quantitative Analytics & Reporting.
**Dependencies**: Requires stable IT Support workflows (specifically the "Resolved" status lifecycle).
**Complexity**: Low
**Preferred Architecture / ADRs**: Standard REST CRUD.

## 6. Real-Time Notifications (v1.6)
**Purpose**: Push live updates to users when their tickets are updated, assigned, or commented on, without requiring page refreshes.
**Benefits**: Drastically improves perceived application responsiveness and user engagement.
**Dependencies**: Needs stable workflows and a robust authorization model to ensure users only receive events they are permitted to see.
**Complexity**: High (Infrastructure)
**Preferred Architecture / ADRs**: 
- **Supabase Realtime**: Tentatively selected as the preferred candidate to avoid managing a custom WebSocket server in our serverless Vercel environment.
- *Requires a dedicated ADR prior to implementation to validate scalability, event publishing strategies, reliability, and reconnect logic.*

---

## 7. Future Enhancements (v2.0+)
- Asset Management (Hardware/Software tracking)
- SLA Automation Rules (Auto-escalations)
- Integration with external identity providers (SSO/SAML)
