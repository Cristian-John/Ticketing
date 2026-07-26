import { db } from '../config/db';
import { Stats } from '../types';

export class StatsService {
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
        
        const row = res.rows[0] as {
            total: number;
            open: number;
            in_progress: number;
            resolved: number;
            severe: number;
            critical: number;
            raw_avg_rating: number | string | null;
            rated: number;
        };

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
