import { Request, Response, NextFunction, RequestHandler } from 'express';
import { db } from '../config/db';
import { UserService } from '../services/user.service';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
        fullName: string;
        email: string;
        role: string;
    };
}

export const requireAuth = (): RequestHandler => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                res.status(401).json({ error: 'Authentication required. Please sign in.' });
                return;
            }

            const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(token) as { userId: string, expiresAt: string } | undefined;
            if (!session) {
                res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
                return;
            }

            // Expiry check
            if (new Date(session.expiresAt) < new Date()) {
                db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
                res.status(401).json({ error: 'Session expired. Please sign in again.' });
                return;
            }

            const user = UserService.getById(session.userId);
            if (!user || Number(user.active) !== 1) {
                res.status(401).json({ error: 'User account is inactive or not found.' });
                return;
            }

            req.user = {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            };

            next();
        } catch (err) {
            next(err);
        }
    };
};

export const requireRole = (...roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Access denied: insufficient permissions.' });
            return;
        }

        next();
    };
};
