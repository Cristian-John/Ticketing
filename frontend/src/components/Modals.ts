import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket } from '../types';
import {
    escapeHTML,
    formatAssignees,
    formatDate,
    getPriorityBadgeClass,
    getSeverityBadgeClass,
    getStatusBadgeClass,
} from '../utils/formatters';
import { EditTicketModal } from './EditTicketModal';
import { showToast } from './Toast';

export class ModalsComponent {
    public static openModal(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');
    }

    public static closeModal(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }

    public static initModalCloseListeners(): void {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const overlay = btn.closest('.modal-overlay');
                if (overlay) overlay.classList.remove('show');
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) {
                    overlay.classList.remove('show');
                }
            });
        });
    }

    public static showTicketDetail(ticket: Ticket, onRefresh: () => void): void {
        const modal = document.getElementById('view-ticket-modal');
        const container = document.getElementById('view-modal-body');
        if (!modal || !container) return;

        const user = store.getState().currentUser;

        container.innerHTML = `
            <div class="detail-header">
                <div>
                    <span class="ticket-id-lg">${escapeHTML(ticket.id)}</span>
                    <h2>${escapeHTML(ticket.title)}</h2>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                    <div class="detail-badges">
                        <span class="badge ${getStatusBadgeClass(ticket.status)}">${ticket.status}</span>
                        <span class="badge ${getPriorityBadgeClass(ticket.priority)}">${ticket.priority}</span>
                        <span class="badge ${getSeverityBadgeClass(ticket.severity)}">${ticket.severity}</span>
                    </div>
                    ${
                        user && (user.role === 'admin' || user.role === 'it-support')
                            ? `
                        <button class="btn btn-secondary btn-sm" id="detail-edit-btn" style="padding: 4px 10px; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Ticket
                        </button>
                    `
                            : ''
                    }
                </div>
            </div>

            <div class="modal-detail-grid">
                <div class="detail-item"><strong>Requester:</strong> ${escapeHTML(ticket.requester)}</div>
                <div class="detail-item"><strong>Department:</strong> ${escapeHTML(ticket.department)}</div>
                <div class="detail-item"><strong>Category:</strong> ${escapeHTML(ticket.category)}</div>
                <div class="detail-item"><strong>Assignee:</strong> ${escapeHTML(formatAssignees(ticket))}</div>
                <div class="detail-item"><strong>Created:</strong> ${formatDate(ticket.createdAt)}</div>
                <div class="detail-item"><strong>Due SLA:</strong> ${formatDate(ticket.dueAt)}</div>
            </div>

            <div class="detail-section">
                <h3>Description</h3>
                <p class="description-text">${escapeHTML(ticket.description || 'No description provided.')}</p>
            </div>

            ${
                ticket.attachments && ticket.attachments.length > 0
                    ? `
                <div class="detail-section">
                    <h3>Attachments</h3>
                    <ul class="attachment-list">
                        ${ticket.attachments
                            .map(
                                a => `
                            <li>
                                <a href="/uploads/${a.filename}" target="_blank" class="attachment-link">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                    ${escapeHTML(a.originalname)} (${Math.round(a.size / 1024)} KB)
                                </a>
                            </li>
                        `,
                            )
                            .join('')}
                    </ul>
                </div>
            `
                    : ''
            }

            <div class="detail-section">
                <h3>Activity & Notes</h3>
                <div class="notes-list">
                    ${
                        ticket.notes && ticket.notes.length > 0
                            ? ticket.notes
                                  .map(
                                      n => `
                        <div class="note-item">
                            <div class="note-header">
                                <strong>${escapeHTML(n.author)}</strong>
                                <small>${n.time}</small>
                            </div>
                            <div class="note-body">${escapeHTML(n.text)}</div>
                        </div>
                    `,
                                  )
                                  .join('')
                            : '<p class="text-muted">No notes recorded.</p>'
                    }
                </div>

                <form id="add-note-form" class="add-note-form" style="margin-top: var(--space-md);">
                    <textarea id="note-text" class="form-control" placeholder="Add a note or update..." rows="3" required></textarea>
                    <button type="submit" class="btn btn-secondary btn-sm" style="margin-top: var(--space-sm);">Post Note</button>
                </form>
            </div>
        `;

        modal.classList.add('show');

        const editBtn = document.getElementById('detail-edit-btn');
        editBtn?.addEventListener('click', () => {
            EditTicketModal.open(ticket, async () => {
                try {
                    const updated = await ticketsAPI.getById(ticket.id);
                    this.showTicketDetail(updated, onRefresh);
                    onRefresh();
                } catch (err) {
                    console.error('Failed to reload ticket after update:', err);
                }
            });
        });

        const noteForm = document.getElementById('add-note-form');
        noteForm?.addEventListener('submit', async e => {
            e.preventDefault();
            const textarea = document.getElementById('note-text') as HTMLTextAreaElement;
            if (!textarea || !textarea.value.trim()) return;

            try {
                const author = user ? user.username : 'User';
                await ticketsAPI.addNote(ticket.id, textarea.value.trim(), author);
                showToast('Note added successfully', 'success');
                const updated = await ticketsAPI.getById(ticket.id);
                this.showTicketDetail(updated, onRefresh);
                onRefresh();
            } catch (err: any) {
                showToast(err.message || 'Failed to add note', 'error');
            }
        });
    }
}
