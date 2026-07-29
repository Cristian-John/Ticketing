import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket } from '../types';
import { handleUIError } from '../utils/errorHandler';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { SupportTicketFilters, TicketFilterMode } from '../utils/SupportTicketFilters';
import { TransitionManager } from '../utils/transitionManager';
import { escapeHTML, formatDate, getSeverityBadgeClass, getStatusBadgeClass } from '../utils/formatters';
import { TicketDetailModal } from '../components/TicketDetailModal';

export class SupportDashboardPage {
    public static async load(): Promise<void> {
        const container = getPortalContentContainer('it-support');
        if (!container) return;

        LoadingManager.registerSkeleton('support-dashboard', () => `
            <div class="stats-grid" style="grid-template-columns: repeat(5, 1fr); margin-bottom: 24px;">
                ${Array.from({ length: 5 }).map(() => `
                    <div class="stat-card skeleton" style="height: 100px; border: 1px solid var(--border);"></div>
                `).join('')}
            </div>
            <div class="skeleton" style="height: 300px; border-radius: 8px;"></div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'support-dashboard');
            const allTickets = await ticketsAPI.getAll();
            await LoadingManager.hideSkeleton(container);

            const user = store.getState().currentUser;
            if (!user) return;

            // Calculate metrics based on the modes
            const owned = SupportTicketFilters.applyFilter(allTickets, TicketFilterMode.Owned, user);
            const unclaimed = SupportTicketFilters.applyFilter(allTickets, TicketFilterMode.Unclaimed, user);
            const collaborating = SupportTicketFilters.applyFilter(allTickets, TicketFilterMode.Collaborating, user);
            const waitingForClient = SupportTicketFilters.applyFilter(allTickets, TicketFilterMode.WaitingForClient, user);
            const dueSoon = SupportTicketFilters.applyFilter(allTickets, TicketFilterMode.DueSoon, user);

            await TransitionManager.crossFadeContent(container, () => {
                container.innerHTML = `
                    <div class="stats-grid" id="support-dashboard-stats" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 24px;">
                        <div class="stat-card clickable-card" data-route="my-tickets" style="border-top: 3px solid var(--accent); cursor: pointer;">
                            <div class="stat-number" style="color: var(--accent)">${owned.length}</div>
                            <div class="stat-label">My Active Tickets</div>
                        </div>
                        <div class="stat-card clickable-card" data-route="unclaimed-tickets" style="border-top: 3px solid var(--status-open); cursor: pointer;">
                            <div class="stat-number" style="color: var(--status-open)">${unclaimed.length}</div>
                            <div class="stat-label">Unclaimed Tickets</div>
                        </div>
                        <div class="stat-card clickable-card" data-route="collaborating-tickets" style="border-top: 3px solid var(--text-muted); cursor: pointer;">
                            <div class="stat-number" style="color: var(--text-muted)">${collaborating.length}</div>
                            <div class="stat-label">Collaborating</div>
                        </div>
                        <div class="stat-card" style="border-top: 3px solid var(--severity-moderate)">
                            <div class="stat-number" style="color: var(--severity-moderate)">${waitingForClient.length}</div>
                            <div class="stat-label">Waiting for Client</div>
                        </div>
                        <div class="stat-card" style="border-top: 3px solid var(--severity-severe)">
                            <div class="stat-number" style="color: var(--severity-severe)">${dueSoon.length}</div>
                            <div class="stat-label">Due Soon / Severe</div>
                        </div>
                    </div>

                    <h3 style="margin-bottom: 12px; font-weight: 600;">My Active Workload</h3>
                    <div class="table-container">
                        <table class="glass-table">
                            <thead>
                                <tr>
                                    <th style="width: 88px">ID</th>
                                    <th>Title</th>
                                    <th style="width: 110px">Department</th>
                                    <th style="width: 86px">Severity</th>
                                    <th style="width: 108px">Status</th>
                                    <th style="width: 86px">Updated</th>
                                </tr>
                            </thead>
                            <tbody id="dashboard-active-workload"></tbody>
                        </table>
                    </div>
                `;

                const body = document.getElementById('dashboard-active-workload');
                if (body) {
                    if (owned.length === 0) {
                        body.innerHTML = `
                            <tr>
                                <td colspan="6" style="padding: var(--space-2xl);">
                                    <div class="empty-state" style="border: none; background: transparent; padding: 0;">
                                        <div class="empty-state-title">No active workload</div>
                                        <p>You have no assigned tickets. Check the Unclaimed queue.</p>
                                    </div>
                                </td>
                            </tr>
                        `;
                    } else {
                        // Show top 10 owned tickets
                        body.innerHTML = owned.slice(0, 10).map(t => `
                            <tr class="clickable-row" data-id="${escapeHTML(t.id)}">
                                <td style="font-family:monospace;font-size:11px;color:var(--text-muted)">${escapeHTML(t.id)}</td>
                                <td style="font-weight:600;color:var(--text-heading);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.title)}</td>
                                <td><span class="badge-dept">${escapeHTML(t.department)}</span></td>
                                <td><span class="badge ${getSeverityBadgeClass(t.severity)}">${escapeHTML(t.severity)}</span></td>
                                <td><span class="badge ${getStatusBadgeClass(t.status)}">${escapeHTML(t.status)}</span></td>
                                <td style="color:var(--text-muted);font-size:11px">${formatDate(t.updatedAt)}</td>
                            </tr>
                        `).join('');

                        body.addEventListener('click', (e) => {
                            const row = (e.target as HTMLElement).closest('.clickable-row');
                            if (row) {
                                const id = row.getAttribute('data-id');
                                const ticket = allTickets.find((t: Ticket) => t.id === id);
                                if (ticket) {
                                    new TicketDetailModal(ticket, () => this.load()).open();
                                }
                            }
                        });
                    }
                }

                // Add click handlers for stat cards
                const statsGrid = document.getElementById('support-dashboard-stats');
                if (statsGrid) {
                    statsGrid.addEventListener('click', (e) => {
                        const card = (e.target as HTMLElement).closest('.clickable-card');
                        if (card) {
                            const route = card.getAttribute('data-route');
                            if (route) {
                                import('../router/router').then(({ Router }) => {
                                    Router.switchView(route, 'support');
                                });
                            }
                        }
                    });
                }
            });
        } catch (err) {
            handleUIError(err, 'Failed to load support dashboard');
        }
    }
}
