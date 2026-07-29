import { Request, Response } from 'express';
import { db } from '../config/db';

export class NotificationController {
    public static async getUnread(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.query.userId as string;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await db.query(`
                SELECT n.*, u.username as actor_name, u."fullName" as actor_full_name
                FROM notifications n
                LEFT JOIN users u ON n.actor_id = u.id
                WHERE n.recipient_id = $1 AND n.read_at IS NULL
                ORDER BY n.created_at DESC
                LIMIT 50
            `, [userId]);

            res.json(result.rows);
        } catch (err: any) {
            console.error('Error fetching unread notifications:', err);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    public static async getAll(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.query.userId as string;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await db.query(`
                SELECT n.*, u.username as actor_name, u."fullName" as actor_full_name
                FROM notifications n
                LEFT JOIN users u ON n.actor_id = u.id
                WHERE n.recipient_id = $1
                ORDER BY n.created_at DESC
                LIMIT 100
            `, [userId]);

            res.json(result.rows);
        } catch (err: any) {
            console.error('Error fetching all notifications:', err);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    public static async markAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.body.userId as string;
            const notificationId = req.params.id;
            
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await db.query(`
                UPDATE notifications
                SET read_at = NOW()
                WHERE id = $1 AND recipient_id = $2
                RETURNING *
            `, [notificationId, userId]);

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Notification not found' });
                return;
            }

            res.json(result.rows[0]);
        } catch (err: any) {
            console.error('Error marking notification as read:', err);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }
    
    public static async markAllAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || req.body.userId as string;
            
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            await db.query(`
                UPDATE notifications
                SET read_at = NOW()
                WHERE recipient_id = $1 AND read_at IS NULL
            `, [userId]);

            res.json({ success: true });
        } catch (err: any) {
            console.error('Error marking all notifications as read:', err);
            res.status(500).json({ error: 'Failed to mark notifications as read' });
        }
    }
}
