import { statsAPI } from '../services/api';
import { store } from '../state/store';
import { StatCardsComponent } from '../components/StatCards';

export class StatisticsPage {
    public static async load(): Promise<void> {
        try {
            const stats = await statsAPI.get();
            store.setStats(stats);
            StatCardsComponent.render(stats);
            this.renderBreakdown(stats);
        } catch (err) {
            console.error('Failed to load statistics:', err);
        }
    }

    private static renderBreakdown(stats: any): void {
        const container = document.getElementById('stats-breakdown-content');
        if (!container) return;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-box">
                    <h4>Total Tickets Created</h4>
                    <div class="stat-number">${stats.total}</div>
                </div>
                <div class="stat-box">
                    <h4>Open Tickets</h4>
                    <div class="stat-number text-open">${stats.open}</div>
                </div>
                <div class="stat-box">
                    <h4>In Progress</h4>
                    <div class="stat-number text-progress">${stats.inProgress}</div>
                </div>
                <div class="stat-box">
                    <h4>Resolved / Closed</h4>
                    <div class="stat-number text-resolved">${stats.resolved}</div>
                </div>
                <div class="stat-box">
                    <h4>Critical / Severe SLA</h4>
                    <div class="stat-number text-severe">${stats.severe}</div>
                </div>
                <div class="stat-box">
                    <h4>Average User Rating</h4>
                    <div class="stat-number text-rating">${stats.avgRating ? `${stats.avgRating} ★` : 'N/A'}</div>
                </div>
            </div>
        `;
    }
}
