import { ticketsAPI, usersAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket } from '../types';
import { createElement } from '../utils/dom';
import { ModalsManager } from './modals/ModalsManager';
import { showToast } from './Toast';

export class EditTicketModal {
    private ticket: Ticket;
    private onSaveCallback: () => void;
    private boundSubmitHandler?: (e: Event) => void;
    private boundCancelHandler?: () => void;
    constructor(ticket: Ticket, onSave: () => void) {
        this.ticket = ticket;
        this.onSaveCallback = onSave;
        const modal = document.getElementById('edit-ticket-modal');
        if (!modal) throw new Error('Edit modal not found');
    }

    public async open(): Promise<void> {
        this.destroy(); // Cleanup previous listeners if any
        await this.create();
        this.render();
        this.attachEvents();
        ModalsManager.openModal('edit-ticket-modal');
    }

    private async create(): Promise<void> {
        const statusSelect = document.getElementById('edit-ticket-status') as HTMLSelectElement;
        const severitySelect = document.getElementById('edit-ticket-severity') as HTMLSelectElement;
        const prioritySelect = document.getElementById('edit-ticket-priority') as HTMLSelectElement;
        const assigneeSelect = document.getElementById('edit-ticket-assignee') as HTMLSelectElement;
        const dueInput = document.getElementById('edit-ticket-due') as HTMLInputElement;

        if (statusSelect) statusSelect.value = this.ticket.status;
        if (severitySelect) severitySelect.value = this.ticket.severity;
        if (prioritySelect) prioritySelect.value = this.ticket.priority;

        if (assigneeSelect) {
            assigneeSelect.innerHTML = '';
            assigneeSelect.appendChild(createElement('option', { attributes: { value: 'Unassigned' }, textContent: 'Unassigned' }));
            try {
                const agents = await usersAPI.getByRole('it-support');
                agents.forEach(agent => {
                    assigneeSelect.appendChild(createElement('option', { attributes: { value: agent.fullName }, textContent: agent.fullName }));
                });
                assigneeSelect.value = this.ticket.assignee || 'Unassigned';
            } catch (err) {
                console.error('Failed to load agents for assignment:', err);
            }
        }

        if (dueInput) {
            if (this.ticket.dueAt) {
                try {
                    const date = new Date(this.ticket.dueAt);
                    const tzOffset = date.getTimezoneOffset() * 60000;
                    const localISOTime = new Date(date.getTime() - tzOffset)
                        .toISOString()
                        .slice(0, 16);
                    dueInput.value = localISOTime;
                } catch {
                    dueInput.value = '';
                }
            } else {
                dueInput.value = '';
            }
        }
    }

    private render(): void {
        // Values were updated in-place on existing HTML elements.
    }

    private attachEvents(): void {
        const form = document.getElementById('edit-ticket-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-edit-modal-btn');

        if (cancelBtn) {
            this.boundCancelHandler = () => {
                ModalsManager.closeModal('edit-ticket-modal');
            };
            cancelBtn.addEventListener('click', this.boundCancelHandler);
        }

        if (form) {
            this.boundSubmitHandler = async (e: Event) => {
                e.preventDefault();

                const statusSelect = document.getElementById('edit-ticket-status') as HTMLSelectElement;
                const severitySelect = document.getElementById('edit-ticket-severity') as HTMLSelectElement;
                const prioritySelect = document.getElementById('edit-ticket-priority') as HTMLSelectElement;
                const assigneeSelect = document.getElementById('edit-ticket-assignee') as HTMLSelectElement;
                const dueInput = document.getElementById('edit-ticket-due') as HTMLInputElement;

                const user = store.getState().currentUser;
                const changedBy = user ? user.username : 'Admin';

                let dueAt: string | undefined = undefined;
                if (dueInput && dueInput.value) {
                    dueAt = new Date(dueInput.value).toISOString();
                }

                try {
                    await ticketsAPI.update(this.ticket.id, {
                        status: statusSelect.value,
                        severity: severitySelect.value,
                        priority: prioritySelect.value,
                        assignee: assigneeSelect.value,
                        dueAt: dueAt || '',
                        changedBy,
                    });

                    showToast('Ticket updated successfully', 'success');
                    ModalsManager.closeModal('edit-ticket-modal');
                    this.onSaveCallback();
                } catch (err: unknown) {
                    showToast((err instanceof Error ? err.message : String(err)) || 'Failed to update ticket', 'error');
                }
            };
            form.addEventListener('submit', this.boundSubmitHandler);
        }
    }

    public destroy(): void {
        const form = document.getElementById('edit-ticket-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-edit-modal-btn');

        if (cancelBtn && this.boundCancelHandler) {
            cancelBtn.removeEventListener('click', this.boundCancelHandler);
        }
        if (form && this.boundSubmitHandler) {
            form.removeEventListener('submit', this.boundSubmitHandler);
        }
    }
}
