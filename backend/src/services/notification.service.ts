import { db, TxContext } from '../config/db';
import { EventBus, DomainEventPayload } from '../utils/EventBus';
import crypto from 'crypto';

export class NotificationService {
    public static initialize() {
        // Bind to transactional events
        EventBus.onTransactional('collaboration.requested', this.handleCollaborationRequested);
        EventBus.onTransactional('collaboration.approved', this.handleCollaborationApproved);
        EventBus.onTransactional('collaboration.rejected', this.handleCollaborationRejected);
        
        EventBus.onTransactional('ticket.transfer_requested', this.handleTransferRequested);
        EventBus.onTransactional('ticket.transfer_approved', this.handleTransferApproved);
        EventBus.onTransactional('ticket.transfer_rejected', this.handleTransferRejected);
        EventBus.onTransactional('ticket.transfer_cancelled', this.handleTransferCancelled);
        EventBus.onTransactional('ticket.transfer_expired', this.handleTransferExpired);
        EventBus.onTransactional('ticket.transfer_invalidated', this.handleTransferInvalidated);
        // Additional events will be bound here as they are refactored
    }

    private static async insertNotification(
        tx: TxContext, 
        recipientId: string, 
        actorId: string | undefined, 
        type: string, 
        entityType: string, 
        entityId: string, 
        title: string, 
        message: string, 
        metadata?: any
    ) {
        const id = crypto.randomUUID();
        await tx.query(`
            INSERT INTO notifications (
                id, recipient_id, actor_id, type, entity_type, entity_id, title, message, metadata
            ) VALUES (
                @id, @recipient_id, @actor_id, @type, @entity_type, @entity_id, @title, @message, @metadata
            )
        `, {
            id,
            recipient_id: recipientId,
            actor_id: actorId || null,
            type,
            entity_type: entityType,
            entity_id: entityId,
            title,
            message,
            metadata: metadata ? JSON.stringify(metadata) : null
        });

        // Emit notification.created so SSE can push it to the specific recipient
        await EventBus.emit(tx, 'notification.created', {
            actorId: actorId || 'system',
            entityId: id, // notification ID
            entityType: 'notification',
            metadata: {
                recipientId,
                type,
                entityType,
                entityId: entityId,
                title,
                message
            }
        });
    }

    private static async markNotificationsNotActionable(tx: TxContext, requestId: string) {
        if (!requestId) return;
        const result = await tx.query(`
            UPDATE notifications 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"actionable": false}'::jsonb
            WHERE (entity_id = $1 OR metadata->>'requestId' = $1) 
              AND (metadata->>'actionable' IS NULL OR metadata->>'actionable' != 'false')
            RETURNING *
        `, [requestId]);

        for (const row of result.rows) {
            await EventBus.emit(tx, 'notification.updated', {
                actorId: 'system',
                entityId: row.id,
                entityType: 'notification',
                metadata: {
                    recipientId: row.recipient_id,
                    notificationId: row.id,
                    actionable: false
                }
            });
        }
    }

    private static handleCollaborationRequested = async (tx: TxContext, payload: DomainEventPayload) => {
        // Need to find the ticket owner
        const res = await tx.query('SELECT primary_assignee_id FROM tickets WHERE id = $1', [payload.entityId]);
        const ownerId = res.rows[0]?.primary_assignee_id;
        
        if (ownerId) {
            await NotificationService.insertNotification(
                tx,
                ownerId,
                payload.actorId,
                'COLLABORATION_REQUESTED',
                payload.entityType,
                payload.entityId,
                'New Collaboration Request',
                `A user has requested to collaborate on ticket ${payload.entityId}`,
                payload.metadata
            );
        }
    };

    private static handleCollaborationApproved = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);
        
        // recipient is in metadata.requesterId
        const requesterId = payload.metadata?.requesterId || payload.metadata?.collaboratorId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'COLLABORATION_APPROVED',
                payload.entityType,
                payload.entityId,
                'Collaboration Approved',
                `Your request to collaborate on ticket ${payload.entityId} was approved.`,
                payload.metadata
            );
        }
    };

    private static handleCollaborationRejected = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const requesterId = payload.metadata?.requesterId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'COLLABORATION_REJECTED',
                payload.entityType,
                payload.entityId,
                'Collaboration Rejected',
                `Your request to collaborate on ticket ${payload.entityId} was rejected.`,
                payload.metadata
            );
        }
    };

    private static handleTransferRequested = async (tx: TxContext, payload: DomainEventPayload) => {
        const targetUserId = payload.metadata?.targetUserId;
        if (targetUserId) {
            await NotificationService.insertNotification(
                tx,
                targetUserId,
                payload.actorId,
                'TICKET_TRANSFER_REQUESTED',
                payload.entityType,
                payload.entityId,
                'New Transfer Request',
                `You have been asked to take ownership of ticket ${payload.metadata?.ticketId}.`,
                payload.metadata
            );
        }
    };

    private static handleTransferApproved = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const requesterId = payload.metadata?.requesterId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'TICKET_TRANSFER_APPROVED',
                payload.entityType,
                payload.entityId,
                'Transfer Request Approved',
                `Your request to transfer ticket ${payload.entityId} was approved.`,
                payload.metadata
            );
        }
    };

    private static handleTransferRejected = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const requesterId = payload.metadata?.requesterId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'TICKET_TRANSFER_REJECTED',
                payload.entityType,
                payload.entityId,
                'Transfer Request Rejected',
                `Your request to transfer ticket ${payload.entityId} was rejected.`,
                payload.metadata
            );
        }
    };

    private static handleTransferCancelled = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const targetUserId = payload.metadata?.targetUserId;
        if (targetUserId) {
            await NotificationService.insertNotification(
                tx,
                targetUserId,
                payload.actorId,
                'TICKET_TRANSFER_CANCELLED',
                payload.entityType,
                payload.entityId,
                'Transfer Request Cancelled',
                `The request to transfer ticket ${payload.entityId} to you has been cancelled.`,
                payload.metadata
            );
        }
    };

    private static handleTransferExpired = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        await NotificationService.markNotificationsNotActionable(tx, requestId);

        const requesterId = payload.metadata?.requesterId;
        if (requesterId) {
            await NotificationService.insertNotification(
                tx,
                requesterId,
                payload.actorId,
                'TICKET_TRANSFER_EXPIRED',
                payload.entityType,
                payload.entityId,
                'Transfer Request Expired',
                `Your request to transfer ticket ${payload.entityId} has expired.`,
                payload.metadata
            );
        }
    };

    private static handleTransferInvalidated = async (tx: TxContext, payload: DomainEventPayload) => {
        const requestId = payload.metadata?.requestId;
        if (requestId) {
            await NotificationService.markNotificationsNotActionable(tx, requestId);
        }

        const requesterId = payload.metadata?.requesterId;
        const targetUserId = payload.metadata?.targetUserId;

        // If we don't have requester/target in metadata (e.g., from generic invalidation), we could fetch it, 
        // but let's just attempt to notify if they are provided. For the system-wide invalidations, we might need to 
        // fetch the pending requests first to notify them. 
        if (requesterId) {
            await NotificationService.insertNotification(tx, requesterId, payload.actorId, 'TICKET_TRANSFER_INVALIDATED', payload.entityType, payload.entityId, 'Transfer Request Closed', `Your request to transfer ticket ${payload.entityId} was automatically closed due to a change in the ticket state.`, payload.metadata);
        }
        if (targetUserId) {
            await NotificationService.insertNotification(tx, targetUserId, payload.actorId, 'TICKET_TRANSFER_INVALIDATED', payload.entityType, payload.entityId, 'Transfer Request Closed', `The pending request to transfer ticket ${payload.entityId} to you was automatically closed due to a change in the ticket state.`, payload.metadata);
        }
    };
}
