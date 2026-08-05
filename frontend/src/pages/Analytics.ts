import { store } from '../state/store';
import { getPortalContentContainer } from '../utils/portalContent';
import { handleUIError, getErrorMessage } from '../utils/errorHandler';
import { escapeHTML } from '../utils/formatters';
import { createElement } from '../utils/dom';
import { IconService } from '../utils/iconService';
import { statsAPI } from '../services/api';
import { BarChart } from '../components/analytics/BarChart';
import { LineChart } from '../components/analytics/LineChart';
import { StatCard } from '../components/analytics/StatCard';
import { TicketsPage } from './Tickets';
import { LoadingManager } from '../utils/loadingManager';
import { TransitionManager } from '../utils/transitionManager';

export class AnalyticsPage {
    private static currentFilters: Record<string, string> = {};
    private static activeTab: 'overview' | 'leaderboards' | 'reports' = 'overview';

    public static async load(): Promise<void> {
        const user = store.getState().currentUser;
        if (!user || user.role === 'client') return;

        const container = getPortalContentContainer(user.role);
        if (!container) return;

        LoadingManager.registerSkeleton('analytics', () => `
            <div class="page-header" style="margin-bottom: var(--space-md)">
                <div class="skeleton skeleton-text" style="width: 200px; height: 32px; margin-bottom: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 300px; height: 16px; margin-bottom: 0;"></div>
            </div>
            <div class="analytics-tabs" style="display: flex; gap: var(--space-md); margin-bottom: var(--space-xl); border-bottom: 1px solid var(--color-border);">
                <div class="skeleton skeleton-text" style="width: 80px; height: 24px; margin: var(--space-sm) 0;"></div>
                <div class="skeleton skeleton-text" style="width: 100px; height: 24px; margin: var(--space-sm) 0;"></div>
                <div class="skeleton skeleton-text" style="width: 120px; height: 24px; margin: var(--space-sm) 0;"></div>
            </div>
            <div id="analytics-filters" style="margin-bottom: var(--space-xl); display: flex; gap: var(--space-md);">
                <div class="skeleton skeleton-text" style="width: 150px; height: 36px; border-radius: 4px;"></div>
                <div class="skeleton skeleton-text" style="width: 150px; height: 36px; border-radius: 4px;"></div>
                <div class="skeleton skeleton-text" style="width: 150px; height: 36px; border-radius: 4px;"></div>
            </div>
            <div class="stats-grid" style="margin-bottom: var(--space-xl);">
                ${Array.from({ length: 4 }).map(() => `
                    <div style="background: var(--card); border-radius: 8px; padding: 20px; border: 1px solid var(--color-border); height: 110px;">
                        <div class="skeleton skeleton-text" style="width: 32px; height: 32px; border-radius: 8px; margin-bottom: 12px;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%; height: 24px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; margin-bottom: 0;"></div>
                    </div>
                `).join('')}
            </div>
            <div class="skeleton skeleton-text" style="height: 300px; width: 100%; border-radius: 8px;"></div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'analytics');

            // Fetch analytics data
            const [kpis, breakdowns, trends, leaderboards] = await Promise.all([
                statsAPI.getExecutiveKPIs(this.currentFilters),
                statsAPI.getBreakdowns(this.currentFilters),
                statsAPI.getTicketTrends(this.currentFilters),
                statsAPI.getLeaderboards(this.currentFilters)
            ]);

            await LoadingManager.hideSkeleton(container);

            await TransitionManager.crossFadeContent(container, () => {
                const headerHtml = `
                    <div class="page-header" style="margin-bottom: var(--space-md)">
                        <h2>Analytics</h2>
                        <p class="text-secondary">Historical reports, trends, and performance metrics.</p>
                    </div>
                    <div class="analytics-tabs" style="display: flex; gap: var(--space-md); margin-bottom: var(--space-xl); border-bottom: 1px solid var(--color-border);">
                        <button class="tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview" style="background:none; border:none; border-bottom: 2px solid ${this.activeTab === 'overview' ? 'var(--color-primary)' : 'transparent'}; padding: var(--space-sm) var(--space-md); color: ${this.activeTab === 'overview' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}; font-weight: 500; cursor: pointer;">Overview</button>
                        <button class="tab-btn ${this.activeTab === 'leaderboards' ? 'active' : ''}" data-tab="leaderboards" style="background:none; border:none; border-bottom: 2px solid ${this.activeTab === 'leaderboards' ? 'var(--color-primary)' : 'transparent'}; padding: var(--space-sm) var(--space-md); color: ${this.activeTab === 'leaderboards' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}; font-weight: 500; cursor: pointer;">Leaderboards</button>
                        <button class="tab-btn ${this.activeTab === 'reports' ? 'active' : ''}" data-tab="reports" style="background:none; border:none; border-bottom: 2px solid ${this.activeTab === 'reports' ? 'var(--color-primary)' : 'transparent'}; padding: var(--space-sm) var(--space-md); color: ${this.activeTab === 'reports' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}; font-weight: 500; cursor: pointer;">Reports & Exports</button>
                    </div>
                    <div id="analytics-filters" style="margin-bottom: var(--space-xl); display: flex; gap: var(--space-md);">
                        <select id="an-filter-dept" class="input"><option value="">All Departments</option><option value="IT">IT</option><option value="HR">HR</option><option value="Facilities">Facilities</option></select>
                        <select id="an-filter-cat" class="input"><option value="">All Categories</option><option value="Hardware">Hardware</option><option value="Software">Software</option><option value="Network">Network</option><option value="Access">Access</option></select>
                        <select id="an-filter-status" class="input"><option value="">All Statuses</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option></select>
                    </div>
                    <div id="analytics-content"></div>
                `;
                container.innerHTML = headerHtml;

                const contentContainer = document.getElementById('analytics-content') as HTMLElement;
                
                if (this.activeTab === 'overview') {
                    this.renderOverview(contentContainer, kpis, breakdowns, trends);
                } else if (this.activeTab === 'leaderboards') {
                    this.renderLeaderboards(contentContainer, leaderboards);
                } else if (this.activeTab === 'reports') {
                    this.renderReports(contentContainer);
                }

                this.bindEvents(container);

                // Sync Filters
                (document.getElementById('an-filter-dept') as HTMLSelectElement).value = this.currentFilters.department || '';
                (document.getElementById('an-filter-cat') as HTMLSelectElement).value = this.currentFilters.category || '';
                (document.getElementById('an-filter-status') as HTMLSelectElement).value = this.currentFilters.status || '';

                IconService.renderIcons(container);
            });
        } catch (err) {
            await LoadingManager.hideSkeleton(container);
            handleUIError(err, 'Failed to load Analytics');
            container.innerHTML = `
                <div class="empty-state" style="margin-top: var(--space-xl);">
                    <div class="empty-state-icon" style="color: var(--color-danger);">
                        <i data-lucide="alert-triangle" style="width: 48px; height: 48px;"></i>
                    </div>
                    <div class="empty-state-title" style="color: var(--color-danger); font-size: 1.25rem;">Failed to Load Analytics</div>
                    <p>${escapeHTML(getErrorMessage(err, 'An unexpected error occurred.'))}</p>
                    <button class="btn btn-primary" style="margin-top: var(--space-md);" onclick="window.location.reload()">Retry</button>
                </div>
            `;
            IconService.renderIcons(container);
        }
    }

    private static bindEvents(container: HTMLElement): void {
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeTab = (e.target as HTMLElement).dataset.tab as any;
                this.load();
            });
        });

        const selects = ['an-filter-dept', 'an-filter-cat', 'an-filter-status'];
        const keys = ['department', 'category', 'status'];
        selects.forEach((id, index) => {
            const el = document.getElementById(id) as HTMLSelectElement;
            if (el) {
                el.addEventListener('change', () => {
                    if (el.value) {
                        this.currentFilters[keys[index]] = el.value;
                    } else {
                        delete this.currentFilters[keys[index]];
                    }
                    this.load();
                });
            }
        });
    }

    private static getTrend(current: number | null | undefined, prev: number | null | undefined, inverse = false) {
        if (current == null || prev == null || prev === 0) return undefined;
        const diff = current - prev;
        if (diff === 0) return { direction: 'neutral' as const, label: 'No change' };
        const pct = Math.abs((diff / prev) * 100).toFixed(1);
        let direction: 'up' | 'down' | 'neutral' = diff > 0 ? 'up' : 'down';
        return {
            direction,
            label: `${diff > 0 ? '+' : '-'}${pct}% vs prev`,
            colorVar: (diff > 0 ? (inverse ? '--color-danger' : '--color-success') : (inverse ? '--color-success' : '--color-danger'))
        };
    }

    private static renderOverview(container: HTMLElement, kpis: any, breakdowns: any, trends: any): void {
        container.innerHTML = '';
        const grid = createElement('div', { className: 'stats-grid' });
        grid.style.marginBottom = 'var(--space-xl)';

        const addStaggerDelay = (el: HTMLElement, index: number) => {
            el.style.animationDelay = `${index * 50}ms`;
        };

        grid.appendChild(new StatCard({ title: 'Open Tickets', value: kpis.open_tickets, icon: 'inbox', colorVar: '--color-warning', trend: this.getTrend(kpis.open_tickets, kpis.prev_open_tickets, true) }).getElement());
        grid.appendChild(new StatCard({ title: 'Resolved', value: kpis.resolved_tickets, icon: 'check-circle', colorVar: '--color-success', trend: this.getTrend(kpis.resolved_tickets, kpis.prev_resolved_tickets) }).getElement());
        grid.appendChild(new StatCard({ title: 'Avg Resolution', value: kpis.avg_resolution_time_seconds ? `${Math.round(kpis.avg_resolution_time_seconds / 3600)} hrs` : '—', icon: 'clock', colorVar: '--color-info', trend: this.getTrend(kpis.avg_resolution_time_seconds, kpis.prev_avg_resolution_time_seconds, true) }).getElement());
        grid.appendChild(new StatCard({ title: 'Overall CSAT', value: kpis.overall_csat ? `${kpis.overall_csat.toFixed(1)} ★` : '—', icon: 'star', colorVar: '--color-primary' }).getElement());
        
        Array.from(grid.children).forEach((child, i) => addStaggerDelay(child as HTMLElement, i));
        container.appendChild(grid);

        const chartsWrapper = createElement('div');
        chartsWrapper.style.display = 'grid';
        chartsWrapper.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
        chartsWrapper.style.gap = 'var(--space-lg)';
        chartsWrapper.style.marginBottom = 'var(--space-xl)';

        const catContainer = createElement('div', { className: 'stat-card' });
        catContainer.innerHTML = '<h3 style="margin: 0 0 var(--space-md) 0; font-size: 1rem; color: var(--color-text-primary)">Tickets by Category</h3>';
        const catChart = new BarChart({
            data: breakdowns.byCategory.map((c: any) => ({ label: c.category || 'Unassigned', value: c.count, colorVar: '--color-primary' })),
            onClick: (item) => {
                if (item.label !== 'Unassigned') {
                    TicketsPage.applyFilterAndNavigate('category', item.label);
                }
            }
        });
        catContainer.appendChild(catChart.getElement());

        const statContainer = createElement('div', { className: 'stat-card' });
        statContainer.innerHTML = '<h3 style="margin: 0 0 var(--space-md) 0; font-size: 1rem; color: var(--color-text-primary)">Tickets by Status</h3>';
        const statChart = new BarChart({
            data: breakdowns.byStatus.map((s: any) => ({
                label: s.status, value: s.count, colorVar: s.status === 'Resolved' || s.status === 'Closed' ? '--color-success' : (s.status === 'Open' ? '--color-warning' : '--color-info')
            })),
            onClick: (item) => {
                TicketsPage.applyFilterAndNavigate('status', item.label);
            }
        });
        statContainer.appendChild(statChart.getElement());

        chartsWrapper.appendChild(catContainer);
        chartsWrapper.appendChild(statContainer);
        
        Array.from(chartsWrapper.children).forEach((child, i) => {
            child.classList.add('fade-in');
            (child as HTMLElement).style.animationDelay = `${(i + 4) * 50}ms`; // offset by stat cards
        });
        
        container.appendChild(chartsWrapper);

        // Trend Chart
        const trendContainer = createElement('div', { className: 'stat-card fade-in' });
        trendContainer.style.animationDelay = `${(6) * 50}ms`;
        trendContainer.style.marginBottom = 'var(--space-xl)';
        trendContainer.innerHTML = '<h3 style="margin: 0 0 var(--space-md) 0; font-size: 1rem; color: var(--color-text-primary)">Ticket Volume Trend (Last 30 Days)</h3>';
        const trendChart = new LineChart({
            data: trends.map((t: any) => ({ label: t.date, value: t.created })), height: '250px', colorVar: '--color-primary'
        });
        trendContainer.appendChild(trendChart.getElement());
        container.appendChild(trendContainer);
    }

    private static renderLeaderboards(container: HTMLElement, leaderboards: any[]): void {
        const lbContainer = createElement('div', { className: 'stats-grid' });
        lbContainer.style.cssText = 'gap: var(--space-lg); grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));';
        const sortedDesc = [...leaderboards].sort((a, b) => b.tickets_resolved - a.tickets_resolved);
        const top5 = sortedDesc.slice(0, 5);
        const bottom5 = [...sortedDesc].reverse().slice(0, 5);

        const renderTable = (title: string, data: any[], color: string) => {
            const w = createElement('div', { className: 'stat-card' });
            w.innerHTML = `
                <h3 style="margin: 0 0 var(--space-md) 0; font-size: 1rem; color: var(--color-text-primary);">${title}</h3>
                <div class="table-container" style="margin: 0;">
                    <table class="table" style="margin: 0; font-size: 0.875rem;">
                        <thead><tr><th>Technician</th><th>Resolved</th><th>CSAT</th></tr></thead>
                        <tbody>
                            ${data.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: var(--color-text-secondary);">No data available</td></tr>` : ''}
                            ${data.map(lb => `<tr><td style="font-weight: 500;">${escapeHTML(lb.tech_name || 'Unknown')}</td><td><span class="badge" style="background: var(${color}); color: white;">${lb.tickets_resolved}</span></td><td>${lb.avg_csat ? Number(lb.avg_csat).toFixed(1) + ' ★' : '—'}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            return w;
        };

        lbContainer.appendChild(renderTable('Top 5 Technicians', top5, '--color-success'));
        lbContainer.appendChild(renderTable('Bottom 5 Technicians', bottom5, '--color-danger'));
        
        Array.from(lbContainer.children).forEach((child, i) => {
            child.classList.add('fade-in');
            (child as HTMLElement).style.animationDelay = `${i * 50}ms`;
        });
        
        container.appendChild(lbContainer);
    }

    private static renderReports(container: HTMLElement): void {
        container.innerHTML = `
            <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: var(--space-xl);">
                <div class="stat-card fade-in" style="animation-delay: 0ms;">
                    <h3 style="margin: 0 0 var(--space-md) 0; font-size: 1rem; color: var(--color-text-primary); display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="download" style="width: 18px; height: 18px;"></i> Export Center
                    </h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--space-lg); font-size: 0.875rem;">Download ticket data for external analysis or archiving.</p>
                    
                    <div style="margin-bottom: var(--space-md);">
                        <label style="display: block; margin-bottom: 4px; font-size: 0.875rem; font-weight: 500;">Data Scope</label>
                        <select id="export-scope" class="input" style="width: 100%;">
                            <option value="filters">Current Filters (Based on top dropdowns)</option>
                            <option value="all">Entire Dataset</option>
                        </select>
                    </div>

                    <div style="display:flex; gap: var(--space-md); margin-top: var(--space-lg);">
                        <button class="btn btn-primary" id="btn-export-csv" style="flex: 1; justify-content: center;">CSV</button>
                        <button class="btn btn-secondary" id="btn-export-xlsx" style="flex: 1; justify-content: center;">XLSX</button>
                        <button class="btn btn-primary" id="btn-export-pdf" style="flex: 1;"><i data-lucide="file-text"></i> PDF</button>
                    </div>
                </div>

                <div class="stat-card fade-in" style="animation-delay: 50ms;">
                    <h3 style="margin: 0 0 var(--space-md) 0; font-size: 1rem; color: var(--color-text-primary); display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="bookmark" style="width: 18px; height: 18px;"></i> Saved Reports
                    </h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--space-lg); font-size: 0.875rem;">Quick access to frequently used filter combinations.</p>
                    
                    <div class="table-container" style="margin: 0;">
                        <table class="table" style="margin: 0; font-size: 0.875rem;">
                            <tbody>
                                <tr>
                                    <td style="font-weight: 500;">Monthly Hardware Issues</td>
                                    <td>Category: Hardware</td>
                                    <td style="text-align: right;"><button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;">Run</button></td>
                                </tr>
                                <tr>
                                    <td style="font-weight: 500;">High Severity Open</td>
                                    <td>Status: Open, Severity: Severe</td>
                                    <td style="text-align: right;"><button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;">Run</button></td>
                                </tr>
                                <tr>
                                    <td style="font-weight: 500;">IT Department Performance</td>
                                    <td>Department: IT, Status: Resolved</td>
                                    <td style="text-align: right;"><button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;">Run</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        const triggerExport = (format: string) => {
            const scope = (document.getElementById('export-scope') as HTMLSelectElement).value;
            // Simulated export
            alert(`Exporting ${scope} data as ${format.toUpperCase()}...`);
        };

        container.querySelector('#btn-export-csv')?.addEventListener('click', () => triggerExport('csv'));
        container.querySelector('#btn-export-xlsx')?.addEventListener('click', () => triggerExport('xlsx'));
        container.querySelector('#btn-export-pdf')?.addEventListener('click', () => triggerExport('pdf'));
    }
}
