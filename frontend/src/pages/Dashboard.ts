import { Ticket, Stats } from '../types';
import { ticketsAPI, statsAPI } from '../services/api';
import { store } from '../state/store';
import { clearPortalContent } from '../utils/portalContent';
import {
    escapeHTML,
    formatDate,
    getStatusBadgeClass,
    getSeverityBadgeClass,
    isResolved,
    getSeverityColor,
} from '../utils/formatters';
import { ModalsComponent } from '../components/Modals';

export class DashboardPage {
    public static async load(): Promise<void> {
        const container = clearPortalContent();
        if (!container) return;

        try {
            const [tickets, stats] = await Promise.all([
                ticketsAPI.getAll(),
                statsAPI.get(),
            ]);

            store.setTickets(tickets);
            store.setStats(stats);

            this.updateAdminSidebarStats(tickets);
            this.renderDashboard(container, tickets, stats);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <p>Failed to load dashboard. Please try again.</p>
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
                    <div class="stat-icon">🎫</div>
                    <div class="stat-number">${stats.total}</div>
                    <div class="stat-label">Total Tickets</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--status-open)">
                    <div class="stat-icon">📂</div>
                    <div class="stat-number" style="color:var(--status-open)">${open}</div>
                    <div class="stat-label">Open</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--status-progress)">
                    <div class="stat-icon">⚙️</div>
                    <div class="stat-number" style="color:var(--status-progress)">${inProg}</div>
                    <div class="stat-label">In Progress</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--severity-severe)">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-number" style="color:var(--severity-severe)">${severe}</div>
                    <div class="stat-label">Severe</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--severity-moderate)">
                    <div class="stat-icon">⭐</div>
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
            list.innerHTML = '<div class="empty-state" style="padding:20px">No recent tickets.</div>';
            return;
        }

        list.innerHTML = '';
        recent.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'mini-card';
            card.style.borderLeft = `3px solid ${getSeverityColor(ticket.severity)}`;
            card.innerHTML = `
                <div class="mini-card-top">
                    <span class="mini-card-id">${escapeHTML(ticket.id)}</span>
                    <span class="badge ${getStatusBadgeClass(ticket.status)}">${escapeHTML(ticket.status)}</span>
                </div>
                <div class="mini-card-title">${escapeHTML(ticket.title)}</div>
                <div class="mini-card-badges">
                    <span class="badge ${getSeverityBadgeClass(ticket.severity)}">${escapeHTML(ticket.severity)}</span>
                    <span class="badge-dept">${escapeHTML(ticket.department)}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                ModalsComponent.showTicketDetail(ticket, () => DashboardPage.load());
            });
            list.appendChild(card);
        });
    }
}
