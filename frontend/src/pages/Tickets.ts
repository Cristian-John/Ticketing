import { Ticket } from '../types';
import { store } from '../state/store';
import { ticketsAPI } from '../services/api';
import { HtmlViewName } from '../router/router';
import { clearPortalContent } from '../utils/portalContent';
import {
    escapeHTML,
    formatDate,
    formatAssignees,
    getStatusBadgeClass,
    getSeverityBadgeClass,
    isResolved,
    getSeverityColor,
    debounce,
} from '../utils/formatters';
import { ModalsComponent } from '../components/Modals';

export class TicketsPage {
    private static adminFiltersBound = false;

    public static async load(htmlView: HtmlViewName): Promise<void> {
        const container = clearPortalContent();
        if (!container) return;

        try {
            const tickets = await ticketsAPI.getAll();
            store.setTickets(tickets);

            const user = store.getState().currentUser;
            if (!user) return;

            if (user.role === 'admin' || user.role === 'it-support') {
                this.updateAdminSidebarStats(tickets);
                if (htmlView === 'all-tickets') {
                    this.renderAdminAllTickets(container, tickets);
                } else if (htmlView === 'resolved') {
                    this.renderResolvedView(container, tickets);
                } else {
                    this.renderAdminAllTickets(container, tickets);
                }
            } else {
                const mine = tickets.filter(
                    t => t.userId === user.id || t.requester.toLowerCase() === user.username.toLowerCase()
                );
                this.updateClientSidebarStats(mine);
                this.renderClientTickets(container, mine);
            }
        } catch (err) {
            console.error('Failed to load tickets:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <p>Failed to load tickets. Please try again.</p>
                </div>
            `;
        }
    }

    private static updateClientSidebarStats(tickets: Ticket[]): void {
        const setStat = (id: string, val: number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };
        setStat('cs-open', tickets.filter(t => t.status === 'Open').length);
        setStat('cs-active', tickets.filter(t => t.status === 'In Progress').length);
        setStat('cs-resolved', tickets.filter(t => isResolved(t)).length);
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

    private static renderClientTickets(container: HTMLElement, tickets: Ticket[]): void {
        if (tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎫</div>
                    <p>No tickets yet. Submit your first IT support request.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        tickets.forEach(ticket => {
            const notes = ticket.notes || [];
            const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
            const card = document.createElement('div');
            card.className = 'client-card';
            card.style.borderLeft = `3px solid ${getSeverityColor(ticket.severity)}`;
            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                    <div style="flex:1;min-width:0">
                        <div style="display:flex;gap:7px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
                            <span style="font-family:monospace;font-size:10px;color:var(--text-muted)">${escapeHTML(ticket.id)}</span>
                            <span class="badge ${getStatusBadgeClass(ticket.status)}">${escapeHTML(ticket.status)}</span>
                            <span class="badge ${getSeverityBadgeClass(ticket.severity)}">${escapeHTML(ticket.severity)}</span>
                            <span class="badge-dept">${escapeHTML(ticket.department)}</span>
                        </div>
                        <div style="font-weight:600;font-size:15px;color:var(--text-heading);margin-bottom:4px">${escapeHTML(ticket.title)}</div>
                        <div style="font-size:12px;color:var(--text-muted)">${escapeHTML(ticket.category)} · ${escapeHTML(formatAssignees(ticket))} · ${formatDate(ticket.updatedAt)}</div>
                        ${lastNote ? `<div class="latest-note">💬 ${escapeHTML(lastNote.text.slice(0, 90))}${lastNote.text.length > 90 ? '…' : ''}</div>` : ''}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => {
                ModalsComponent.showTicketDetail(ticket, () => this.load('my-tickets'));
            });
            container.appendChild(card);
        });
    }

    private static getAdminFilteredTickets(tickets: Ticket[]): Ticket[] {
        const status = (document.getElementById('admin-filter-status') as HTMLSelectElement)?.value || 'all';
        const severity = (document.getElementById('admin-filter-severity') as HTMLSelectElement)?.value || 'all';
        const dept = (document.getElementById('admin-filter-dept') as HTMLSelectElement)?.value || 'all';
        const search = (document.getElementById('admin-search') as HTMLInputElement)?.value.trim().toLowerCase() || '';

        return tickets
            .filter(t => status === 'all' || t.status === status)
            .filter(t => severity === 'all' || t.severity === severity)
            .filter(t => dept === 'all' || t.department === dept)
            .filter(t => {
                if (!search) return true;
                const haystack = [t.id, t.title, t.requester, t.department, t.description || '']
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(search);
            });
    }

    private static renderAdminAllTickets(container: HTMLElement, allTickets: Ticket[]): void {
        const tickets = this.getAdminFilteredTickets(allTickets);

        container.innerHTML = `
            <div class="table-wrap">
                <div class="table-head">
                    <span style="flex:0 0 88px">ID</span>
                    <span style="flex:1">Title</span>
                    <span style="flex:0 0 110px">Department</span>
                    <span style="flex:0 0 86px">Severity</span>
                    <span style="flex:0 0 108px">Status</span>
                    <span style="flex:0 0 100px">Requester</span>
                    <span style="flex:0 0 56px">Rating</span>
                    <span style="flex:0 0 86px">Updated</span>
                </div>
                <div id="ticket-table-body"></div>
            </div>
        `;

        const body = document.getElementById('ticket-table-body');
        if (!body) return;

        if (tickets.length === 0) {
            body.innerHTML = '<div class="empty-state" style="padding:30px">No tickets found.</div>';
        } else {
            body.innerHTML = tickets.map(t => `
                <div class="table-row" data-id="${escapeHTML(t.id)}">
                    <span style="flex:0 0 88px;font-family:monospace;font-size:11px;color:var(--text-muted)">${escapeHTML(t.id)}</span>
                    <span style="flex:1;font-weight:600;color:var(--text-heading);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.title)}</span>
                    <span style="flex:0 0 110px"><span class="badge-dept">${escapeHTML(t.department)}</span></span>
                    <span style="flex:0 0 86px"><span class="badge ${getSeverityBadgeClass(t.severity)}">${escapeHTML(t.severity)}</span></span>
                    <span style="flex:0 0 108px"><span class="badge ${getStatusBadgeClass(t.status)}">${escapeHTML(t.status)}</span></span>
                    <span style="flex:0 0 100px;color:var(--text-muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.requester)}</span>
                    <span style="flex:0 0 56px;color:var(--severity-moderate);font-size:12px">${t.rating != null ? t.rating + '★' : '—'}</span>
                    <span style="flex:0 0 86px;color:var(--text-muted);font-size:11px">${formatDate(t.updatedAt)}</span>
                </div>
            `).join('');

            body.querySelectorAll('.table-row').forEach(row => {
                row.addEventListener('click', () => {
                    const id = row.getAttribute('data-id');
                    const ticket = tickets.find(t => t.id === id);
                    if (ticket) {
                        ModalsComponent.showTicketDetail(ticket, () => this.load('all-tickets'));
                    }
                });
            });
        }

        this.bindAdminFilters();
    }

    private static bindAdminFilters(): void {
        if (this.adminFiltersBound) return;
        this.adminFiltersBound = true;

        const rerender = debounce(() => {
            this.load('all-tickets');
        }, 300);

        document.getElementById('admin-search')?.addEventListener('input', rerender);
        document.getElementById('admin-filter-status')?.addEventListener('change', rerender);
        document.getElementById('admin-filter-severity')?.addEventListener('change', rerender);
        document.getElementById('admin-filter-dept')?.addEventListener('change', rerender);
    }

    private static renderResolvedView(container: HTMLElement, allTickets: Ticket[]): void {
        const resolved = allTickets.filter(t => isResolved(t));
        const rated = resolved.filter(t => t.rating !== null);
        const avg = rated.length
            ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1)
            : null;

        container.innerHTML = `
            <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
                <div class="stat-card" style="border-top:3px solid var(--status-resolved)">
                    <div class="stat-number" style="color:var(--status-resolved)">${resolved.length}</div>
                    <div class="stat-label">Total Resolved</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--severity-moderate)">
                    <div class="stat-number" style="color:var(--severity-moderate)">${rated.length}</div>
                    <div class="stat-label">Rated Tickets</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--severity-moderate)">
                    <div class="stat-number" style="color:var(--severity-moderate)">${avg ? avg + '★' : '—'}</div>
                    <div class="stat-label">Avg Rating</div>
                </div>
            </div>
            <div class="table-wrap">
                <div class="table-head">
                    <span style="flex:0 0 88px">ID</span>
                    <span style="flex:1">Ticket</span>
                    <span style="flex:0 0 100px">Requester</span>
                    <span style="flex:0 0 100px">Rating</span>
                    <span style="flex:0 0 86px">Resolved</span>
                </div>
                <div id="resolved-table-body"></div>
            </div>
        `;

        const body = document.getElementById('resolved-table-body');
        if (!body) return;

        if (resolved.length === 0) {
            body.innerHTML = '<div class="empty-state" style="padding:30px">No resolved tickets yet.</div>';
            return;
        }

        body.innerHTML = resolved.map(t => `
            <div class="table-row" data-id="${escapeHTML(t.id)}">
                <span style="flex:0 0 88px;font-family:monospace;font-size:11px;color:var(--text-muted)">${escapeHTML(t.id)}</span>
                <span style="flex:1;font-weight:600;color:var(--text-heading);font-size:13px">${escapeHTML(t.title)}</span>
                <span style="flex:0 0 100px;color:var(--text-secondary);font-size:12px">${escapeHTML(t.requester)}</span>
                <span style="flex:0 0 100px;color:var(--severity-moderate);font-size:12px">${t.rating != null ? t.rating + '★' : 'Unrated'}</span>
                <span style="flex:0 0 86px;color:var(--text-muted);font-size:11px">${formatDate(t.updatedAt)}</span>
            </div>
        `).join('');

        body.querySelectorAll('.table-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.getAttribute('data-id');
                const ticket = resolved.find(t => t.id === id);
                if (ticket) {
                    ModalsComponent.showTicketDetail(ticket, () => this.load('resolved'));
                }
            });
        });
    }
}
