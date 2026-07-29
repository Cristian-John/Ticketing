import { AppNotification } from '../types';
import { notificationsAPI } from '../services/api';

import { ticketsAPI } from '../services/api';
import { TicketDetailModal } from './TicketDetailModal';
import { AllNotificationsModal } from './AllNotificationsModal';
import { showToast } from './Toast';
import { handleUIError } from '../utils/errorHandler';

export class NotificationsDropdown {
    private container: HTMLElement;
    private isOpen: boolean = false;
    private notifications: AppNotification[] = [];
    private onUnreadCountChanged?: (count: number) => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.container.contains(e.target as Node)) {
                this.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'Escape') {
                this.close();
            }
        });
    }

    public setOnUnreadCountChanged(callback: (count: number) => void) {
        this.onUnreadCountChanged = callback;
    }

    public async loadNotifications() {
        try {
            this.notifications = await notificationsAPI.getUnread();
            this.renderList();
            if (this.onUnreadCountChanged) {
                this.onUnreadCountChanged(this.notifications.length);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
    }

    public toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.container.querySelector('.notifications-popover')?.classList.add('open');
        } else {
            this.container.querySelector('.notifications-popover')?.classList.remove('open');
        }
    }

    public close() {
        this.isOpen = false;
        this.container.querySelector('.notifications-popover')?.classList.remove('open');
    }

    private async handleNotificationClick(notification: AppNotification) {
        try {
            // Optimistic update
            this.notifications = this.notifications.filter(n => n.id !== notification.id);
            this.renderList();
            if (this.onUnreadCountChanged) {
                this.onUnreadCountChanged(this.notifications.length);
            }

            await notificationsAPI.markAsRead(notification.id);
            this.close();

            // Navigate based on entity type
            if (notification.entity_type === 'ticket') {
                try {
                    const ticket = await ticketsAPI.getById(notification.entity_id);
                    new TicketDetailModal(ticket, () => {}).open();
                } catch (e) {
                    console.error('Failed to load ticket for notification', e);
                }
            }
        } catch (err) {
            console.error('Failed to handle notification click:', err);
            // Revert on error
            await this.loadNotifications();
        }
    }

    private async markAllAsRead() {
        try {
            await notificationsAPI.markAllAsRead();
            this.notifications = [];
            this.renderList();
            if (this.onUnreadCountChanged) {
                this.onUnreadCountChanged(0);
            }
            this.close();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }

    private render() {
        this.container.innerHTML = `
            <div class="notifications-popover">
                <div class="notifications-header">
                    <h3>Notifications</h3>
                    <button class="mark-all-read">Mark all as read</button>
                </div>
                <div class="notifications-list">
                    <!-- Notifications will be rendered here -->
                </div>
                <div class="notifications-footer">
                    <a href="#" class="view-all">View all notifications</a>
                </div>
            </div>
        `;

        this.container.querySelector('.mark-all-read')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.markAllAsRead();
        });
        
        this.container.querySelector('.view-all')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.close();
            new AllNotificationsModal().open();
        });
    }

    private renderList() {
        const listContainer = this.container.querySelector('.notifications-list');
        if (!listContainer) return;

        if (this.notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="notifications-empty">
                    No new notifications
                </div>
            `;
            return;
        }

        // Limit to latest 10 notifications
        const displayNotifications = this.notifications.slice(0, 10);

        listContainer.innerHTML = displayNotifications.map(n => {
            let actionsHtml = '';
            if (n.type === 'COLLABORATION_REQUESTED') {
                actionsHtml = `
                    <div class="notification-actions">
                        <button class="btn btn-primary btn-sm accept-collab" data-req-id="${n.entity_id}">Accept</button>
                        <button class="btn btn-secondary btn-sm reject-collab" data-req-id="${n.entity_id}">Reject</button>
                    </div>
                `;
            } else if (n.type === 'TICKET_TRANSFER_REQUESTED') {
                actionsHtml = `
                    <div class="notification-actions">
                        <button class="btn btn-primary btn-sm accept-transfer" data-req-id="${n.metadata?.requestId || ''}">Accept</button>
                        <button class="btn btn-secondary btn-sm reject-transfer" data-req-id="${n.metadata?.requestId || ''}">Reject</button>
                    </div>
                `;
            }

            return `
            <div class="notification-item unread" data-id="${n.id}">
                <div class="notification-icon">
                    ${this.getIconForType(n.type)}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message}</div>
                    ${actionsHtml}
                    <div class="notification-meta" style="margin-top: 6px;">
                        <span>${n.actor_name || 'System'}</span>
                        <span>${this.formatRelativeTime(new Date(n.created_at))}</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Attach item click listeners
        listContainer.querySelectorAll('.notification-item').forEach(el => {
            el.addEventListener('click', (e) => {
                // If clicked on an action button, don't trigger item click
                if ((e.target as HTMLElement).closest('.notification-actions')) {
                    return;
                }
                
                e.stopPropagation();
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
                        await this.loadNotifications();
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
                        await this.loadNotifications();
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
                        await this.loadNotifications();
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
                        await this.loadNotifications();
                    } catch (err) {
                        handleUIError(err, 'Failed to reject transfer');
                    }
                }
            });
        });
    }

    private formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return date.toLocaleDateString();
    }

    private getIconForType(type: string): string {
        const svgSize = 16;
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
