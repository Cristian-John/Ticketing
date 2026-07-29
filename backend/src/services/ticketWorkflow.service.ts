import { db } from '../config/db';
import { TicketHistory, TicketCollaborator } from '../types';

export class TicketWorkflowService {
    
    /**
     * Helper to log an extensible event in ticket_history
     */
    public static async logEvent(ticketId: string, actorId: string, eventType: string, eventData: any): Promise<void> {
        await db.query(`
            INSERT INTO ticket_history ("ticket_id", "actor_id", "event_type", "event_data")
            VALUES (@ticket_id, @actor_id, @event_type, @event_data)
        `, {
            ticket_id: ticketId,
            actor_id: actorId,
            event_type: eventType,
            event_data: JSON.stringify(eventData)
        });
    }

    /**
     * Get the event history for a ticket
     */
    public static async getHistory(ticketId: string): Promise<TicketHistory[]> {
        const res = await db.query(`
            SELECT * FROM ticket_history 
            WHERE ticket_id = $1 
            ORDER BY created_at DESC
        `, [ticketId]);
        return res.rows as TicketHistory[];
    }

    /**
     * Get collaborators for a ticket
     */
    public static async getCollaborators(ticketId: string): Promise<TicketCollaborator[]> {
        const res = await db.query(`
            SELECT * FROM ticket_collaborators 
            WHERE ticket_id = $1
        `, [ticketId]);
        return res.rows as TicketCollaborator[];
    }

    /**
     * Claim an unassigned ticket
     */
    public static async claimTicket(ticketId: string, actorId: string, actorName: string): Promise<void> {
        // Find existing ticket
        const existingRes = await db.query('SELECT status, assignee, primary_assignee_id FROM tickets WHERE id = $1', [ticketId]);
        if (existingRes.rowCount === 0) throw new Error('Ticket not found');
        const existing = existingRes.rows[0];

        // Ensure ticket isn't already claimed by someone else
        if (existing.primary_assignee_id && existing.primary_assignee_id !== actorId) {
            throw new Error('Ticket is already assigned to someone else.');
        }

        const newStatus = existing.status === 'New' || existing.status === 'Open' ? 'Assigned' : existing.status;

        await db.query(`
            UPDATE tickets 
            SET "primary_assignee_id" = @actor_id,
                "assignee" = @actor_name,
                "status" = @status,
                "updatedAt" = @now
            WHERE id = @ticket_id
        `, {
            actor_id: actorId,
            actor_name: actorName,
            status: newStatus,
            now: new Date(),
            ticket_id: ticketId
        });

        await this.logEvent(ticketId, actorId, 'claimed', {
            old_status: existing.status,
            new_status: newStatus,
            assignee_id: actorId,
            assignee_name: actorName
        });
    }

    /**
     * Assign a ticket to a specific user
     */
    public static async assignTicket(ticketId: string, targetUserId: string, targetUserName: string, actorId: string): Promise<void> {
        const existingRes = await db.query('SELECT status FROM tickets WHERE id = $1', [ticketId]);
        if (existingRes.rowCount === 0) throw new Error('Ticket not found');
        const existing = existingRes.rows[0];

        const newStatus = existing.status === 'New' || existing.status === 'Open' ? 'Assigned' : existing.status;

        await db.query(`
            UPDATE tickets 
            SET "primary_assignee_id" = @target_user_id,
                "assignee" = @target_user_name,
                "status" = @status,
                "updatedAt" = @now
            WHERE id = @ticket_id
        `, {
            target_user_id: targetUserId,
            target_user_name: targetUserName,
            status: newStatus,
            now: new Date(),
            ticket_id: ticketId
        });

        await this.logEvent(ticketId, actorId, 'assigned', {
            old_status: existing.status,
            new_status: newStatus,
            assignee_id: targetUserId,
            assignee_name: targetUserName
        });
    }

    /**
     * Transfer ownership of a ticket to another technician
     */
    public static async transferTicket(
        ticketId: string, 
        targetUserId: string, 
        reason: string, 
        remainCollaborator: boolean, 
        actorId: string,
        actorRole: string
    ): Promise<void> {
        // Find existing ticket
        const existingRes = await db.query('SELECT status, department, primary_assignee_id FROM tickets WHERE id = $1', [ticketId]);
        if (existingRes.rowCount === 0) throw new Error('Ticket not found');
        const existing = existingRes.rows[0];

        // Ensure actor has permission to transfer
        if (actorRole !== 'admin' && existing.primary_assignee_id !== actorId) {
            throw new Error('Only the primary assignee or an administrator can transfer ownership of this ticket.');
        }

        // Validate target user exists and has correct role
        const targetUserRes = await db.query('SELECT id, "fullName", role FROM users WHERE id = $1', [targetUserId]);
        if (targetUserRes.rowCount === 0) throw new Error('Target technician not found.');
        const targetUser = targetUserRes.rows[0];
        
        if (targetUser.role !== 'it-support' && targetUser.role !== 'admin') {
            throw new Error('Target user must be an IT Support technician or Administrator.');
        }

        const newStatus = existing.status === 'New' || existing.status === 'Open' ? 'Assigned' : existing.status;

        // Transfer updates assignee but keeps department
        await db.query(`
            UPDATE tickets 
            SET "primary_assignee_id" = @target_user_id,
                "assignee" = @target_user_name,
                "status" = @status,
                "updatedAt" = @now
            WHERE id = @ticket_id
        `, {
            target_user_id: targetUserId,
            target_user_name: targetUser.fullName,
            status: newStatus,
            now: new Date(),
            ticket_id: ticketId
        });

        // Add current owner to collaborators if requested
        if (remainCollaborator && existing.primary_assignee_id) {
            await db.query(`
                INSERT INTO ticket_collaborators ("ticket_id", "user_id")
                VALUES (@ticket_id, @user_id)
                ON CONFLICT ("ticket_id", "user_id") DO NOTHING
            `, {
                ticket_id: ticketId,
                user_id: existing.primary_assignee_id
            });
        }

        await this.logEvent(ticketId, actorId, 'ownership_transferred', {
            previousOwnerId: existing.primary_assignee_id,
            newOwnerId: targetUserId,
            newOwnerName: targetUser.fullName,
            reason: reason || null,
            remainedCollaborator: remainCollaborator
        });
    }

    /**
     * Add a collaborator (secondary support)
     */
    public static async addCollaborator(ticketId: string, targetUserId: string, actorId: string): Promise<void> {
        // Verify ticket exists
        const existingRes = await db.query('SELECT 1 FROM tickets WHERE id = $1', [ticketId]);
        if (existingRes.rowCount === 0) throw new Error('Ticket not found');

        // Insert collaborator (on conflict ignore)
        await db.query(`
            INSERT INTO ticket_collaborators ("ticket_id", "user_id")
            VALUES (@ticket_id, @user_id)
            ON CONFLICT ("ticket_id", "user_id") DO NOTHING
        `, {
            ticket_id: ticketId,
            user_id: targetUserId
        });

        await this.logEvent(ticketId, actorId, 'collaborator_added', {
            collaborator_id: targetUserId
        });
    }

    /**
     * Reopen a resolved ticket (within 14 days)
     */
    public static async reopenTicket(ticketId: string, actorId: string): Promise<void> {
        const existingRes = await db.query('SELECT status, "updatedAt" FROM tickets WHERE id = $1', [ticketId]);
        if (existingRes.rowCount === 0) throw new Error('Ticket not found');
        const existing = existingRes.rows[0];

        if (existing.status !== 'Resolved' && existing.status !== 'Closed') {
            throw new Error('Only resolved or closed tickets can be reopened.');
        }

        const updatedAt = new Date(existing.updatedAt).getTime();
        const now = Date.now();
        const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate > 14) {
            throw new Error('Tickets cannot be reopened after 14 days of being resolved.');
        }

        await db.query(`
            UPDATE tickets 
            SET "status" = 'Open',
                "updatedAt" = @now
            WHERE id = @ticket_id
        `, {
            now: new Date(),
            ticket_id: ticketId
        });

        await this.logEvent(ticketId, actorId, 'reopened', {
            old_status: existing.status,
            new_status: 'Open',
            reason: 'Client requested reopen.'
        });
    }
}
