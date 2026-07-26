import { ModalsComponent } from '../components/Modals';
import { HtmlViewName } from '../router/router';
import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket } from '../types';
import {
    debounce,
    escapeHTML,
    formatAssignees,
    formatDate,
    getSeverityBadgeClass,
    getSeverityColor,
    getStatusBadgeClass,
    isResolved,
} from '../utils/formatters';
import { clearPortalContent } from '../utils/portalContent';

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
                    t =>
                        t.userId === user.id ||
                        t.requester.toLowerCase() === user.username.toLowerCase(),
                );
                this.updateClientSidebarStats(mine);
                this.renderClientTickets(container, mine);
            }
        } catch (err) {
            console.error('Failed to load tickets:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
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
                    <div class="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div class="empty-state-title">No tickets yet</div>
                    <p>Submit your first IT support request.</p>
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
        const status =
            (document.getElementById('admin-filter-status') as HTMLSelectElement)?.value || 'all';
        const severity =
            (document.getElementById('admin-filter-severity') as HTMLSelectElement)?.value || 'all';
        const dept =
            (document.getElementById('admin-filter-dept') as HTMLSelectElement)?.value || 'all';
        const search =
            (document.getElementById('admin-search') as HTMLInputElement)?.value
                .trim()
                .toLowerCase() || '';

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
            <div class="table-container">
                <table class="glass-table">
                    <thead>
                        <tr>
                            <th style="width: 88px">ID</th>
                            <th>Title</th>
                            <th style="width: 110px">Department</th>
                            <th style="width: 86px">Severity</th>
                            <th style="width: 108px">Status</th>
                            <th style="width: 100px">Requester</th>
                            <th style="width: 56px">Rating</th>
                            <th style="width: 86px">Updated</th>
                        </tr>
                    </thead>
                    <tbody id="ticket-table-body"></tbody>
                </table>
            </div>
        `;

        const body = document.getElementById('ticket-table-body');
        if (!body) return;

        if (tickets.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: var(--space-2xl);">
                        <div class="empty-state" style="border: none; background: transparent; padding: 0;">
                            <div class="empty-state-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
                            </div>
                            <div class="empty-state-title">No tickets found</div>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            body.innerHTML = tickets
                .map(
                    t => `
                <tr class="clickable-row" data-id="${escapeHTML(t.id)}">
                    <td style="font-family:monospace;font-size:11px;color:var(--text-muted)">${escapeHTML(t.id)}</td>
                    <td style="font-weight:600;color:var(--text-heading);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.title)}</td>
                    <td><span class="badge-dept">${escapeHTML(t.department)}</span></td>
                    <td><span class="badge ${getSeverityBadgeClass(t.severity)}">${escapeHTML(t.severity)}</span></td>
                    <td><span class="badge ${getStatusBadgeClass(t.status)}">${escapeHTML(t.status)}</span></td>
                    <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(t.requester)}</td>
                    <td style="color:var(--severity-moderate)">${t.rating != null ? t.rating + '★' : '—'}</td>
                    <td style="color:var(--text-muted);font-size:11px">${formatDate(t.updatedAt)}</td>
                </tr>
            `,
                )
                .join('');

            body.querySelectorAll('.clickable-row').forEach(row => {
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
            <div class="table-container">
                <table class="glass-table">
                    <thead>
                        <tr>
                            <th style="width: 88px">ID</th>
                            <th>Ticket</th>
                            <th style="width: 100px">Requester</th>
                            <th style="width: 100px">Rating</th>
                            <th style="width: 86px">Resolved</th>
                        </tr>
                    </thead>
                    <tbody id="resolved-table-body"></tbody>
                </table>
            </div>
        `;

        const body = document.getElementById('resolved-table-body');
        if (!body) return;

        if (resolved.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: var(--space-2xl);">
                        <div class="empty-state" style="border: none; background: transparent; padding: 0;">
                            <div class="empty-state-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </div>
                            <div class="empty-state-title">No resolved tickets yet</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = resolved
            .map(
                t => `
            <tr class="clickable-row" data-id="${escapeHTML(t.id)}">
                <td style="font-family:monospace;font-size:11px;color:var(--text-muted)">${escapeHTML(t.id)}</td>
                <td style="font-weight:600;color:var(--text-heading)">${escapeHTML(t.title)}</td>
                <td>${escapeHTML(t.requester)}</td>
                <td style="color:var(--severity-moderate)">${t.rating != null ? t.rating + '★' : 'Unrated'}</td>
                <td style="color:var(--text-muted);font-size:11px">${formatDate(t.updatedAt)}</td>
            </tr>
        `,
            )
            .join('');

        body.querySelectorAll('.clickable-row').forEach(row => {
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
