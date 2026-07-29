import { AppNotification } from '../types';
import { notificationsAPI } from '../services/api';
import { ticketsAPI } from '../services/api';
import { TicketDetailModal } from './TicketDetailModal';
import { showToast } from './Toast';
import { handleUIError } from '../utils/errorHandler';

export class AllNotificationsModal {
    private element: HTMLElement;
    private notifications: AppNotification[] = [];

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.render();
    }

    public async open() {
        document.getElementById('modal-root')?.appendChild(this.element);
        try {
            this.notifications = await notificationsAPI.getAll();
            this.renderList();
        } catch (err) {
            handleUIError(err, 'Failed to load notifications');
        }
    }

    public close() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    private render() {
        this.element.innerHTML = `
            <div class="modal-content" style="max-width: 600px; width: 100%;">
                <div class="modal-header">
                    <h2>All Notifications</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body p-0">
                    <div class="notifications-full-list" style="max-height: 60vh; overflow-y: auto;">
                        <div class="p-6 text-center text-slate-400">Loading...</div>
                    </div>
                </div>
            </div>
        `;

        this.element.querySelector('.modal-close')?.addEventListener('click', () => this.close());
        
        // Close on outside click
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) this.close();
        });
    }

    private renderList() {
        const listContainer = this.element.querySelector('.notifications-full-list');
        if (!listContainer) return;

        if (this.notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="p-6 text-center text-slate-400">
                    No notifications found.
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.notifications.map(n => {
            let actionsHtml = '';
            if (n.type === 'COLLABORATION_REQUESTED' && !n.read_at) {
                actionsHtml = `
                    <div class="notification-actions mt-2 flex gap-2">
                        <button class="btn btn-primary btn-sm accept-collab" data-req-id="${n.entity_id}">Accept</button>
                        <button class="btn btn-secondary btn-sm reject-collab" data-req-id="${n.entity_id}">Reject</button>
                    </div>
                `;
            } else if (n.type === 'TICKET_TRANSFER_REQUESTED' && !n.read_at) {
                actionsHtml = `
                    <div class="notification-actions mt-2 flex gap-2">
                        <button class="btn btn-primary btn-sm accept-transfer" data-req-id="${n.metadata?.requestId || ''}">Accept</button>
                        <button class="btn btn-secondary btn-sm reject-transfer" data-req-id="${n.metadata?.requestId || ''}">Reject</button>
                    </div>
                `;
            }

            const isUnread = !n.read_at;

            return `
            <div class="p-4 border-b border-slate-700/50 hover:bg-slate-700 cursor-pointer transition-colors ${isUnread ? 'bg-slate-800/50' : ''} notification-item" data-id="${n.id}">
                <div class="flex items-start gap-4">
                    <div class="mt-1 shrink-0">
                        ${this.getIconForType(n.type)}
                    </div>
                    <div class="flex-grow">
                        <div class="text-sm font-medium ${isUnread ? 'text-slate-100' : 'text-slate-300'}">${n.title}</div>
                        <div class="text-sm text-slate-400 mt-1">${n.message}</div>
                        ${actionsHtml}
                        <div class="text-xs text-slate-500 mt-2 flex justify-between">
                            <span>${n.actor_name || 'System'}</span>
                            <span>${new Date(n.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Attach item click listeners
        listContainer.querySelectorAll('.notification-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).closest('.notification-actions')) {
                    return;
                }
                
                const id = el.getAttribute('data-id');
                const notification = this.notifications.find(n => n.id === id);
                if (notification) {
                    this.handleNotificationClick(notification);
                }
            });
        });

        // Attach inline action listeners
        listContainer.querySelectorAll('.accept-collab').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reqId = btn.getAttribute('data-req-id');
                if (reqId) {
                    try {
                        await ticketsAPI.approveCollaboration(reqId);
                        showToast('Request approved', 'success');
                        this.open(); // reload
                    } catch (err) {
                        handleUIError(err, 'Failed to approve request');
                    }
                }
            });
        });

        listContainer.querySelectorAll('.reject-collab').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reqId = btn.getAttribute('data-req-id');
                if (reqId) {
                    try {
                        await ticketsAPI.rejectCollaboration(reqId, 'Rejected from notification center');
                        showToast('Request rejected', 'success');
                        this.open(); // reload
                    } catch (err) {
                        handleUIError(err, 'Failed to reject request');
                    }
                }
            });
        });

        listContainer.querySelectorAll('.accept-transfer').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reqId = btn.getAttribute('data-req-id');
                if (reqId) {
                    try {
                        await ticketsAPI.approveTransfer(reqId);
                        showToast('Transfer request approved', 'success');
                        this.open(); // reload
                    } catch (err) {
                        handleUIError(err, 'Failed to approve transfer');
                    }
                }
            });
        });

        listContainer.querySelectorAll('.reject-transfer').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reqId = btn.getAttribute('data-req-id');
                if (reqId) {
                    try {
                        await ticketsAPI.rejectTransfer(reqId, 'Rejected from notification center');
                        showToast('Transfer request rejected', 'success');
                        this.open(); // reload
                    } catch (err) {
                        handleUIError(err, 'Failed to reject transfer');
                    }
                }
            });
        });
    }

    private async handleNotificationClick(notification: AppNotification) {
        if (!notification.read_at) {
            try {
                await notificationsAPI.markAsRead(notification.id);
                // Update local state to show as read without full reload
                notification.read_at = new Date().toISOString();
                this.renderList();
            } catch (err) {
                console.error('Failed to mark read', err);
            }
        }
        
        this.close();

        if (notification.entity_type === 'ticket') {
            try {
                const ticket = await ticketsAPI.getById(notification.entity_id);
                new TicketDetailModal(ticket, () => {}).open();
            } catch (e) {
                console.error('Failed to load ticket for notification', e);
            }
        }
    }

    private getIconForType(type: string): string {
        const svgSize = 20;
        switch (type) {
            case 'COLLABORATION_REQUESTED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`;
            case 'COLLABORATION_APPROVED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`;
            case 'COLLABORATION_REJECTED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="22" y2="12"></line><line x1="22" y1="8" x2="18" y2="12"></line></svg>`;
            case 'TICKET_TRANSFERRED':
            case 'TICKET_TRANSFER_REQUESTED':
            case 'TICKET_TRANSFER_APPROVED':
            case 'TICKET_OWNERSHIP_TRANSFERRED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2"><path d="M17 3v18"></path><path d="M3 10h14"></path><path d="m14 7 3 3-3 3"></path></svg>`;
            case 'TICKET_TRANSFER_REJECTED':
            case 'TICKET_TRANSFER_CANCELLED':
            case 'TICKET_TRANSFER_EXPIRED':
            case 'TICKET_TRANSFER_INVALIDATED':
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2"><path d="M17 3v18"></path><path d="M3 10h14"></path><path d="m14 7 3 3-3 3"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;
            default:
                return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
        }
    }
}
