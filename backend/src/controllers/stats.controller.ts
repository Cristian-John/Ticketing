import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/stats.service';

export class StatsController {
    public static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await StatsService.getStats();
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }
}
