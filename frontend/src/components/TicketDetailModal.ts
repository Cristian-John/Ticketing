import { ticketsAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket } from '../types';
import { createElement } from '../utils/dom';
import {
    formatAssignees,
    formatDate,
    getPriorityBadgeClass,
    getSeverityBadgeClass,
    getStatusBadgeClass,
} from '../utils/formatters';
import { EditTicketModal } from './EditTicketModal';
import { ModalsComponent } from './Modals';
import { showToast } from './Toast';

export class TicketDetailModal {
    private container: HTMLElement;
    private ticket: Ticket;
    private onRefresh: () => void;
    private boundEditHandler?: () => void;
    private boundSubmitHandler?: (e: Event) => void;

    constructor(ticket: Ticket, onRefresh: () => void) {
        this.ticket = ticket;
        this.onRefresh = onRefresh;
        const body = document.getElementById('view-modal-body');
        if (!body) throw new Error('Modal body not found');
        this.container = body;
    }

    public open(): void {
        this.destroy(); // clean up previous if any
        this.create();
        this.render();
        this.attachEvents();
        ModalsComponent.openModal('view-ticket-modal');
    }

    private create(): void {
        const user = store.getState().currentUser;

        // Header
        const headerDiv = createElement('div', { className: 'detail-header' });
        
        const titleWrapper = createElement('div');
        titleWrapper.appendChild(createElement('span', { className: 'ticket-id-lg', textContent: this.ticket.id }));
        titleWrapper.appendChild(createElement('h2', { textContent: this.ticket.title }));
        
        const badgesWrapper = createElement('div', { 
            attributes: { style: 'display:flex; flex-direction:column; align-items:flex-end; gap:8px;' } 
        });
        
        const detailBadges = createElement('div', { className: 'detail-badges' });
        detailBadges.appendChild(createElement('span', { className: `badge ${getStatusBadgeClass(this.ticket.status)}`, textContent: this.ticket.status }));
        detailBadges.appendChild(createElement('span', { className: `badge ${getPriorityBadgeClass(this.ticket.priority)}`, textContent: this.ticket.priority }));
        detailBadges.appendChild(createElement('span', { className: `badge ${getSeverityBadgeClass(this.ticket.severity)}`, textContent: this.ticket.severity }));
        badgesWrapper.appendChild(detailBadges);

        if (user && (user.role === 'admin' || user.role === 'it-support')) {
            const editBtnSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Ticket`;
            const editBtn = createElement('button', {
                className: 'btn btn-secondary btn-sm',
                id: 'detail-edit-btn',
                innerHTML: editBtnSvg,
                attributes: { style: 'padding: 4px 10px; font-size: 12px; display: flex; align-items: center; gap: 4px;' }
            });
            badgesWrapper.appendChild(editBtn);
        }

        headerDiv.appendChild(titleWrapper);
        headerDiv.appendChild(badgesWrapper);
        this.container.appendChild(headerDiv);

        // Grid
        const gridDiv = createElement('div', { className: 'modal-detail-grid' });
        const gridItems = [
            { label: 'Requester:', val: this.ticket.requester },
            { label: 'Department:', val: this.ticket.department },
            { label: 'Category:', val: this.ticket.category },
            { label: 'Assignee:', val: formatAssignees(this.ticket) },
            { label: 'Created:', val: formatDate(this.ticket.createdAt) },
            { label: 'Due SLA:', val: formatDate(this.ticket.dueAt) },
        ];
        gridItems.forEach(item => {
            const div = createElement('div', { className: 'detail-item' });
            div.appendChild(createElement('strong', { textContent: item.label }));
            div.appendChild(document.createTextNode(' ' + (item.val || '')));
            gridDiv.appendChild(div);
        });
        this.container.appendChild(gridDiv);

        // Description
        const descDiv = createElement('div', { className: 'detail-section' });
        descDiv.appendChild(createElement('h3', { textContent: 'Description' }));
        descDiv.appendChild(createElement('p', { className: 'description-text', textContent: this.ticket.description || 'No description provided.' }));
        this.container.appendChild(descDiv);

        // Attachments
        if (this.ticket.attachments && this.ticket.attachments.length > 0) {
            const attDiv = createElement('div', { className: 'detail-section' });
            attDiv.appendChild(createElement('h3', { textContent: 'Attachments' }));
            const attList = createElement('ul', { className: 'attachment-list' });
            this.ticket.attachments.forEach(a => {
                const li = createElement('li');
                const svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
                const link = createElement('a', {
                    className: 'attachment-link',
                    attributes: { href: `/uploads/${a.filename}`, target: '_blank' },
                    innerHTML: svgIcon + ' ' + a.originalname + ' (' + Math.round(a.size / 1024) + ' KB)'
                });
                li.appendChild(link);
                attList.appendChild(li);
            });
            attDiv.appendChild(attList);
            this.container.appendChild(attDiv);
        }

        // Activity & Notes
        const notesDiv = createElement('div', { className: 'detail-section' });
        notesDiv.appendChild(createElement('h3', { textContent: 'Activity & Notes' }));
        
        const notesListDiv = createElement('div', { className: 'notes-list' });
        if (this.ticket.notes && this.ticket.notes.length > 0) {
            this.ticket.notes.forEach(n => {
                const noteItem = createElement('div', { className: 'note-item' });
                const header = createElement('div', { className: 'note-header' });
                header.appendChild(createElement('strong', { textContent: n.author }));
                header.appendChild(createElement('small', { textContent: n.time }));
                noteItem.appendChild(header);
                noteItem.appendChild(createElement('div', { className: 'note-body', textContent: n.text }));
                notesListDiv.appendChild(noteItem);
            });
        } else {
            notesListDiv.appendChild(createElement('p', { className: 'text-muted', textContent: 'No notes recorded.' }));
        }
        notesDiv.appendChild(notesListDiv);

        const form = createElement('form', { id: 'add-note-form', className: 'add-note-form', attributes: { style: 'margin-top: var(--space-md);' } });
        form.appendChild(createElement('textarea', { id: 'note-text', className: 'form-control', attributes: { placeholder: 'Add a note or update...', rows: '3', required: 'true' } }));
        form.appendChild(createElement('button', { className: 'btn btn-secondary btn-sm', textContent: 'Post Note', attributes: { type: 'submit', style: 'margin-top: var(--space-sm);' } }));
        
        notesDiv.appendChild(form);
        this.container.appendChild(notesDiv);
    }

    private render(): void {
        // Render implicitly happened during create as we appended to this.container.
    }

    private attachEvents(): void {
        const editBtn = document.getElementById('detail-edit-btn');
        if (editBtn) {
            this.boundEditHandler = () => {
                const editModal = new EditTicketModal(this.ticket, async () => {
                    try {
                        const updated = await ticketsAPI.getById(this.ticket.id);
                        this.ticket = updated;
                        this.open();
                        this.onRefresh();
                    } catch (err) {
                        console.error('Failed to reload ticket after update:', err);
                    }
                });
                editModal.open();
            };
            editBtn.addEventListener('click', this.boundEditHandler);
        }

        const noteForm = document.getElementById('add-note-form');
        if (noteForm) {
            this.boundSubmitHandler = async (e: Event) => {
                e.preventDefault();
                const textarea = document.getElementById('note-text') as HTMLTextAreaElement;
                if (!textarea || !textarea.value.trim()) return;

                try {
                    const user = store.getState().currentUser;
                    const author = user ? user.username : 'User';
                    await ticketsAPI.addNote(this.ticket.id, textarea.value.trim(), author);
                    showToast('Note added successfully', 'success');
                    const updated = await ticketsAPI.getById(this.ticket.id);
                    this.ticket = updated;
                    this.open();
                    this.onRefresh();
                } catch (err: any) {
                    showToast(err.message || 'Failed to add note', 'error');
                }
            };
            noteForm.addEventListener('submit', this.boundSubmitHandler);
        }
    }

    public destroy(): void {
        const editBtn = document.getElementById('detail-edit-btn');
        if (editBtn && this.boundEditHandler) {
            editBtn.removeEventListener('click', this.boundEditHandler);
        }
        const noteForm = document.getElementById('add-note-form');
        if (noteForm && this.boundSubmitHandler) {
            noteForm.removeEventListener('submit', this.boundSubmitHandler);
        }
        this.container.innerHTML = '';
    }
}
