import { TicketDetailModal } from '../components/TicketDetailModal';
import { statsAPI,ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { Stats,Ticket } from '../types';
import { getErrorMessage, handleUIError } from '../utils/errorHandler';
import {
    escapeHTML,
    getSeverityBadgeClass,
    getSeverityColor,
    getStatusBadgeClass,
    isResolved,
} from '../utils/formatters';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { TransitionManager } from '../utils/transitionManager';

export class DashboardPage {
    public static async load(): Promise<void> {
        const container = getPortalContentContainer(store.getState().currentUser!.role);
        if (!container) return;

        LoadingManager.registerSkeleton('dashboard', () => `
            <div class="stats-grid" style="margin-bottom: 24px;">
                ${Array.from({ length: 5 }).map(() => `
                    <div style="background: var(--bg-card); border-radius: 8px; padding: 20px; border: 1px solid var(--border); height: 110px;">
                        <div class="skeleton skeleton-text" style="width: 32px; height: 32px; border-radius: 8px; margin-bottom: 12px;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%; height: 24px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; margin-bottom: 0;"></div>
                    </div>
                `).join('')}
            </div>
            <div>
                <h3 style="color:var(--text-heading);margin:0 0 12px 0;font-size:16px">Recent Activity</h3>
                ${Array.from({ length: 3 }).map(() => `
                    <div style="background: var(--bg-card); border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border);">
                        <div class="skeleton skeleton-text" style="width: 30%; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 70%; margin-bottom: 12px;"></div>
                        <div style="display: flex; gap: 8px;">
                            <div class="skeleton skeleton-btn" style="width: 60px; height: 24px; border-radius: 12px;"></div>
                            <div class="skeleton skeleton-btn" style="width: 60px; height: 24px; border-radius: 12px;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'dashboard');
            const [tickets, stats] = await Promise.all([ticketsAPI.getAll(), statsAPI.get()]);
            await LoadingManager.hideSkeleton(container);

            await TransitionManager.crossFadeContent(container, () => {
                this.updateAdminSidebarStats(tickets);
                this.renderDashboard(container, tickets, stats);
            });
        } catch (err) {
            handleUIError(err, 'Failed to load dashboard');
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <p>${escapeHTML(getErrorMessage(err, 'Failed to load dashboard. Please try again.'))}</p>
                </div>
            `;
        }
    }

    private static updateAdminSidebarStats(tickets: Ticket[]): void {
        const setStat = (id: string, val: string | number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };
        const rated = tickets.filter(t => t.rating !== null);
        const avg = rated.length
            ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1)
            : '—';

        setStat('as-open', tickets.filter(t => t.status === 'Open').length);
        setStat('as-progress', tickets.filter(t => t.status === 'In Progress').length);
        setStat('as-severe', tickets.filter(t => t.severity === 'Severe' && !isResolved(t)).length);
        setStat('as-resolved', tickets.filter(t => isResolved(t)).length);
        setStat('as-rating', avg !== '—' ? `${avg}★` : '—');
    }

    private static renderDashboard(container: HTMLElement, tickets: Ticket[], stats: Stats): void {
        const open = stats.open;
        const inProg = stats.inProgress;
        const severe = stats.severe;
        const avgRating = stats.avgRating ? `${stats.avgRating}★` : '—';
        const recent = [...tickets]
            .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
            .slice(0, 5);

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card" style="border-top:3px solid #ab91ff">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </div>
                    <div class="stat-number">${stats.total}</div>
                    <div class="stat-label">Total Tickets</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--status-open)">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div class="stat-number" style="color:var(--status-open)">${open}</div>
                    <div class="stat-label">Open</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--status-progress)">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    </div>
                    <div class="stat-number" style="color:var(--status-progress)">${inProg}</div>
                    <div class="stat-label">In Progress</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--severity-severe)">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                    </div>
                    <div class="stat-number" style="color:var(--severity-severe)">${severe}</div>
                    <div class="stat-label">Severe</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--severity-moderate)">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </div>
                    <div class="stat-number" style="color:var(--severity-moderate)">${avgRating}</div>
                    <div class="stat-label">Avg Rating</div>
                </div>
            </div>
            <div style="margin-top:24px">
                <h3 style="color:var(--text-heading);margin:0 0 12px 0;font-size:16px">Recent Activity</h3>
                <div id="dashboard-recent-list"></div>
            </div>
        `;

        const list = document.getElementById('dashboard-recent-list');
        if (!list) return;

        if (recent.length === 0) {
            list.innerHTML =
                '<div class="empty-state" style="padding:20px">No recent tickets.</div>';
            return;
        }

        list.innerHTML = recent.map(ticket => `
            <div class="mini-card" data-id="${escapeHTML(ticket.id)}" style="border-left: 3px solid ${getSeverityColor(ticket.severity)}">
                <div class="mini-card-top">
                    <span class="mini-card-id">${escapeHTML(ticket.id)}</span>
                    <span class="badge ${getStatusBadgeClass(ticket.status)}">${escapeHTML(ticket.status)}</span>
                </div>
                <div class="mini-card-title">${escapeHTML(ticket.title)}</div>
                <div class="mini-card-badges">
                    <span class="badge ${getSeverityBadgeClass(ticket.severity)}">${escapeHTML(ticket.severity)}</span>
                    <span class="badge-dept">${escapeHTML(ticket.department)}</span>
                </div>
            </div>
        `).join('');
        
        list.addEventListener('click', (e) => {
            const card = (e.target as HTMLElement).closest('.mini-card');
            if (card) {
                const id = card.getAttribute('data-id');
                const ticket = recent.find(t => t.id === id);
                if (ticket) {
                    new TicketDetailModal(ticket, () => DashboardPage.load()).open();
                }
            }
        });
    }
}
