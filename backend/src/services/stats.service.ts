import { db } from '../config/db';
import { Ticket } from '../types';

const stmtGetAllTickets = db.prepare(`SELECT * FROM tickets`);

export class StatsService {
    public static getStats(): {
        total: number;
        open: number;
        inProgress: number;
        resolved: number;
        severe: number;
        critical: number;
        avgRating: string | null;
        rated: number;
    } {
        const all = stmtGetAllTickets.all() as Ticket[];
        const total = all.length;
        const open = all.filter(t => t.status === 'Open').length;
        const inProgress = all.filter(t => t.status === 'In Progress').length;
        const resolved = all.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
        const severe = all.filter(t => t.severity === 'Severe' && t.status !== 'Resolved' && t.status !== 'Closed').length;
        const critical = all.filter(t => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;

        const rated = all.filter(t => t.rating !== null);
        const avgRating = rated.length ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1) : null;

        return { total, open, inProgress, resolved, severe, critical, avgRating, rated: rated.length };
    }
}
