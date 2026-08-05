import { db } from '../config/db';
import { Stats } from '../types';
import { StatsRepository, StatsFilterParams } from '../repositories/stats.repository';
import { EventBus } from '../utils/EventBus';

export class StatsService {
    // In-memory cache for fast analytics
    // Key format: 'type|hash(filters)'
    private static cache = new Map<string, { data: any, expiresAt: number }>();
    private static readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes default

    public static initializeCacheInvalidation() {
        const clearCache = () => {
            console.log('[StatsService] Invalidating analytics cache due to event.');
            this.cache.clear();
        };

        // These events signify changes in ticket or rating states
        EventBus.onPostCommit('ticket.created', clearCache);
        EventBus.onPostCommit('ticket.updated', clearCache);
        EventBus.onPostCommit('ticket.resolved', clearCache);
        EventBus.onPostCommit('ticket.reopened', clearCache);
        EventBus.onPostCommit('ticket.deleted', clearCache);
        EventBus.onPostCommit('ticket.rated', clearCache);
    }

    private static getCacheKey(type: string, filters: StatsFilterParams): string {
        const sortedFilters = Object.entries(filters)
            .filter(([_, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
        return `${type}|${sortedFilters}`;
    }

    private static async getCachedOrFetch<T>(type: string, filters: StatsFilterParams, fetcher: () => Promise<T>): Promise<T> {
        const key = this.getCacheKey(type, filters);
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            return cached.data as T;
        }

        const data = await fetcher();
        this.cache.set(key, { data, expiresAt: now + this.CACHE_TTL_MS });
        return data;
    }

    public static async getExecutiveKPIs(filters: StatsFilterParams) {
        return this.getCachedOrFetch('kpi', filters, () => StatsRepository.getExecutiveKPIs(filters));
    }

    public static async getTicketTrends(filters: StatsFilterParams) {
        return this.getCachedOrFetch('trends', filters, () => StatsRepository.getTicketTrends(filters));
    }

    public static async getBreakdowns(filters: StatsFilterParams) {
        return this.getCachedOrFetch('breakdowns', filters, () => StatsRepository.getBreakdowns(filters));
    }

    public static async getSidebarStats(filters: StatsFilterParams) {
        return this.getCachedOrFetch('sidebar', filters, () => StatsRepository.getSidebarStats(filters));
    }

    public static async getLeaderboards(filters: StatsFilterParams) {
        return this.getCachedOrFetch('leaderboards', filters, () => StatsRepository.getLeaderboards(filters));
    }

    public static async getRecentFeedback(filters: StatsFilterParams) {
        return this.getCachedOrFetch('recent_feedback', filters, () => StatsRepository.getRecentFeedback(filters));
    }

    // Legacy support for existing dashboard while migrating
    public static async getStats(): Promise<Stats> {
        const res = await db.query(`
            SELECT
                COUNT(*)::integer as total,
                SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END)::integer as open,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END)::integer as in_progress,
                SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END)::integer as resolved,
                SUM(CASE WHEN severity = 'Severe' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END)::integer as severe,
                SUM(CASE WHEN priority = 'Critical' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END)::integer as critical,
                AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as raw_avg_rating,
                SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END)::integer as rated
            FROM tickets
        `);
        
        const row = res.rows[0] as any;
        const avgRating = row.raw_avg_rating !== null && row.raw_avg_rating !== undefined
            ? Number(row.raw_avg_rating).toFixed(1)
            : null;

        return {
            total: row.total || 0,
            open: row.open || 0,
            inProgress: row.in_progress || 0,
            resolved: row.resolved || 0,
            severe: row.severe || 0,
            critical: row.critical || 0,
            avgRating,
            rated: row.rated || 0,
        };
    }
}
