import { TicketDetailModal } from '../components/TicketDetailModal';
import { statsAPI, ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket, ExecutiveKPIs, RecentFeedback } from '../types';
import { getErrorMessage, handleUIError } from '../utils/errorHandler';
import {
    escapeHTML,
    getSeverityBadgeClass,
    getSeverityColor,
    getStatusBadgeClass,
} from '../utils/formatters';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { TransitionManager } from '../utils/transitionManager';
import { StatCard } from '../components/analytics/StatCard';
import { createElement } from '../utils/dom';
import { IconService } from '../utils/iconService';

export class DashboardPage {

    public static async load(): Promise<void> {
        const currentUser = store.getState().currentUser;
        if (!currentUser) return;
        
        const container = getPortalContentContainer(currentUser.role);
        if (!container) return;

        LoadingManager.registerSkeleton('dashboard', () => `
            <div class="stats-grid" style="margin-bottom: 24px;">
                ${Array.from({ length: 4 }).map(() => `
                    <div style="background: var(--card); border-radius: 8px; padding: 20px; border: 1px solid var(--border); height: 110px;">
                        <div class="skeleton skeleton-text" style="width: 32px; height: 32px; border-radius: 8px; margin-bottom: 12px;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%; height: 24px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; margin-bottom: 0;"></div>
                    </div>
                `).join('')}
            </div>
            <div class="skeleton skeleton-text" style="height: 300px; width: 100%; border-radius: 8px;"></div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'dashboard');
            
            // Parallel fetch
            const [recentTickets, kpis, sidebarStats, recentFeedback] = await Promise.all([
                ticketsAPI.getRecent(5),
                statsAPI.getExecutiveKPIs({}),
                statsAPI.getSidebarStats({}),
                statsAPI.getRecentFeedback({})
            ]);
            
            await LoadingManager.hideSkeleton(container);

            await TransitionManager.crossFadeContent(container, () => {
                this.updateAdminSidebarStats(sidebarStats);
                
                const role = currentUser.role;
                
                const headerHtml = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                        <h2 style="font-size: 1.5rem; color: var(--foreground); margin: 0;">
                            ${role === 'admin' ? 'Executive Dashboard' : 'My Dashboard'}
                        </h2>
                    </div>
                    <div id="dashboard-content" style="background: white; padding: var(--spacing-md); border-radius: var(--radius)"></div>
                `;
                
                container.innerHTML = headerHtml;
                const contentContainer = document.getElementById('dashboard-content') as HTMLElement;

                if (role === 'admin') {
                    this.renderAdminDashboard(contentContainer, kpis, recentTickets);
                } else {
                    this.renderTechDashboard(contentContainer, kpis, recentTickets, recentFeedback);
                }

                IconService.renderIcons(contentContainer);
            });
        } catch (err) {
            await LoadingManager.hideSkeleton(container);
            handleUIError(err, 'Failed to load dashboard');
            container.innerHTML = `
                <div class="empty-state" style="margin-top: var(--space-xl);">
                    <div class="empty-state-icon" style="color: var(--color-danger);">
                        <i data-lucide="alert-triangle" style="width: 48px; height: 48px;"></i>
                    </div>
                    <div class="empty-state-title" style="color: var(--color-danger); font-size: 1.25rem;">Failed to Load Dashboard</div>
                    <p>${escapeHTML(getErrorMessage(err, 'An unexpected error occurred.'))}</p>
                    <button class="btn btn-primary" style="margin-top: var(--space-md);" onclick="window.location.reload()">Retry</button>
                </div>
            `;
            IconService.renderIcons(container);
        }
    }

    private static updateAdminSidebarStats(sidebarStats: any): void {
        const setStat = (id: string, val: string | number) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };
        
        const avg = sidebarStats.avg_csat ? Number(sidebarStats.avg_csat).toFixed(1) : '—';

        setStat('as-open', sidebarStats.open_tickets || 0);
        setStat('as-progress', sidebarStats.in_progress_tickets || 0);
        setStat('as-severe', sidebarStats.severe_tickets || 0);
        setStat('as-resolved', sidebarStats.resolved_tickets || 0);
        setStat('as-rating', avg !== '—' ? `${avg}★` : '—');
    }

    private static renderAdminDashboard(container: HTMLElement, kpis: ExecutiveKPIs, tickets: Ticket[]): void {
        container.innerHTML = '';
        
        // 1. KPI Grid
        const grid = createElement('div', { className: 'stats-grid' });
        grid.style.marginBottom = 'var(--spacing-xl)';
        
        const getTrend = (current: number | null | undefined, prev: number | null | undefined, inverse = false) => {
            if (current == null || prev == null || prev === 0) return undefined;
            const diff = current - prev;
            if (diff === 0) return { direction: 'neutral' as const, label: 'No change' };
            const pct = Math.abs((diff / prev) * 100).toFixed(1);
            let direction: 'up' | 'down' | 'neutral' = diff > 0 ? 'up' : 'down';
            return {
                direction,
                label: `${diff > 0 ? '+' : '-'}${pct}% vs prev`,
                colorVar: (diff > 0 ? (inverse ? '--danger' : '--success') : (inverse ? '--success' : '--danger'))
            };
        };

        const openCard = new StatCard({
            title: 'Open Tickets',
            value: kpis.open_tickets,
            icon: 'inbox',
            colorVar: '--warning',
            trend: getTrend(kpis.open_tickets, kpis.prev_open_tickets, true)
        });
        const resolvedCard = new StatCard({
            title: 'Resolved',
            value: kpis.resolved_tickets,
            icon: 'check-circle',
            colorVar: '--success',
            trend: getTrend(kpis.resolved_tickets, kpis.prev_resolved_tickets)
        });
        const csatCard = new StatCard({
            title: 'Overall CSAT',
            value: kpis.overall_csat ? `${kpis.overall_csat.toFixed(1)} ★` : '—',
            icon: 'star',
            colorVar: '--primary' // No prev csat yet, keep it simple
        });
        const timeCard = new StatCard({
            title: 'Avg Resolution',
            value: kpis.avg_resolution_time_seconds ? `${Math.round(kpis.avg_resolution_time_seconds / 3600)} hrs` : '—',
            icon: 'clock',
            colorVar: '--info',
            trend: getTrend(kpis.avg_resolution_time_seconds, kpis.prev_avg_resolution_time_seconds, true)
        });

        grid.appendChild(openCard.getElement());
        grid.appendChild(resolvedCard.getElement());
        grid.appendChild(timeCard.getElement());
        grid.appendChild(csatCard.getElement());
        container.appendChild(grid);

        // 2. Recent Activity (Global)
        this.renderRecentActivity(container, tickets);
    }

    private static renderTechDashboard(container: HTMLElement, kpis: ExecutiveKPIs, tickets: Ticket[], recentFeedback: RecentFeedback[]): void {
        container.innerHTML = '';
        
        // 1. Tech KPI Grid
        const grid = createElement('div', { className: 'stats-grid' });
        grid.style.marginBottom = 'var(--spacing-xl)';
        
        const getTrend = (current: number | null | undefined, prev: number | null | undefined, inverse = false) => {
            if (current == null || prev == null || prev === 0) return undefined;
            const diff = current - prev;
            if (diff === 0) return { direction: 'neutral' as const, label: 'No change' };
            const pct = Math.abs((diff / prev) * 100).toFixed(1);
            let direction: 'up' | 'down' | 'neutral' = diff > 0 ? 'up' : 'down';
            return {
                direction,
                label: `${diff > 0 ? '+' : '-'}${pct}% vs prev`,
                colorVar: (diff > 0 ? (inverse ? '--danger' : '--success') : (inverse ? '--success' : '--danger'))
            };
        };

        const myOpen = new StatCard({
            title: 'My Open Tasks',
            value: kpis.open_tickets + kpis.in_progress_tickets,
            icon: 'briefcase',
            colorVar: '--warning',
            trend: getTrend(kpis.open_tickets + kpis.in_progress_tickets, (kpis.prev_open_tickets || 0), true) // Approximation
        });
        const myResolved = new StatCard({
            title: 'My Resolved',
            value: kpis.resolved_tickets,
            icon: 'check-square',
            colorVar: '--success',
            trend: getTrend(kpis.resolved_tickets, kpis.prev_resolved_tickets)
        });
        const myCsat = new StatCard({
            title: 'My CSAT',
            value: kpis.overall_csat ? `${kpis.overall_csat.toFixed(1)} ★` : '—',
            icon: 'star',
            colorVar: '--primary'
        });
        const myReopens = new StatCard({
            title: 'My Reopens',
            value: kpis.total_reopens,
            icon: 'rotate-ccw',
            colorVar: '--danger'
        });

        grid.appendChild(myOpen.getElement());
        grid.appendChild(myResolved.getElement());
        grid.appendChild(myCsat.getElement());
        grid.appendChild(myReopens.getElement());
        container.appendChild(grid);



        // Recent CSAT Feedback
        const feedbackContainer = createElement('div', { className: 'stat-card' });
        feedbackContainer.style.marginBottom = 'var(--spacing-xl)';
        feedbackContainer.innerHTML = '<h3 style="margin: 0 0 var(--spacing-md) 0; font-size: 1rem; color: var(--foreground)">Recent CSAT Feedback</h3>';
        
        const feedbackList = createElement('div', { className: 'dashboard-recent-list' });
        if (recentFeedback.length === 0) {
            feedbackList.innerHTML = '<div class="empty-state" style="padding:20px; color: var(--muted);">No recent feedback.</div>';
        } else {
            feedbackList.innerHTML = recentFeedback.map(fb => `
                <div class="mini-card" data-id="${escapeHTML(fb.ticket_id)}" style="border-left: 3px solid ${fb.rating >= 4 ? 'var(--success)' : (fb.rating === 3 ? 'var(--warning)' : 'var(--danger)')}">
                    <div class="mini-card-top">
                        <span class="mini-card-id" style="font-weight: 500;">${fb.rating} ★</span>
                        <span class="mini-card-date">${new Date(fb.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="mini-card-title">${escapeHTML(fb.ticket_title)}</div>
                    ${fb.comment ? `<div style="font-size: 0.875rem; color: var(--muted); margin-top: 4px; font-style: italic;">"${escapeHTML(fb.comment)}"</div>` : ''}
                </div>
            `).join('');
            
            // Add click handlers for the cards
            setTimeout(() => {
                const cards = feedbackList.querySelectorAll('.mini-card');
                cards.forEach(card => {
                    card.addEventListener('click', async () => {
                        const id = card.getAttribute('data-id');
                        if (id) {
                            try {
                                const ticket = await ticketsAPI.getById(id);
                                new TicketDetailModal(ticket, () => DashboardPage.load()).open();
                            } catch (err) {
                                handleUIError(err, 'Failed to load ticket details');
                            }
                        }
                    });
                });
            }, 0);
        }
        feedbackContainer.appendChild(feedbackList);
        container.appendChild(feedbackContainer);

        // 3. My Recent Tickets
        const myUserId = store.getState().currentUser?.id;
        const myTickets = tickets.filter(t => t.primary_assignee_id === myUserId);
        this.renderRecentActivity(container, myTickets, 'My Recent Tickets');
    }

    private static renderRecentActivity(container: HTMLElement, tickets: Ticket[], title = 'Recent Activity'): void {
        const recentWrapper = createElement('div');
        recentWrapper.innerHTML = `<h3 style="color:var(--foreground);margin:0 0 12px 0;font-size:16px">${escapeHTML(title)}</h3>`;
        
        const list = createElement('div', { className: 'dashboard-recent-list' });
        const recent = [...tickets]
            .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
            .slice(0, 5);

        if (recent.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:20px">No recent tickets.</div>';
        } else {
            list.innerHTML = recent.map(ticket => `
                <div class="mini-card" data-id="${escapeHTML(ticket.id)}" style="border-left: 3px solid ${getSeverityColor(ticket.severity)}">
                    <div class="mini-card-top">
                        <span class="mini-card-id">${escapeHTML(ticket.id)}</span>
                        <span class="badge ${getStatusBadgeClass(ticket.status)}">${escapeHTML(ticket.status)}</span>
                    </div>
                    <div class="mini-card-title">${escapeHTML(ticket.title)}</div>
                    <div class="mini-card-badges">
                        <span class="badge ${getSeverityBadgeClass(ticket.severity)}">${escapeHTML(ticket.severity)}</span>
                        <span class="badge-dept">${escapeHTML(ticket.department || '')}</span>
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

        recentWrapper.appendChild(list);
        container.appendChild(recentWrapper);
    }

}

