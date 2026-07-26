import { ticketsAPI, usersAPI } from '../services/api';
import { store } from '../state/store';
import { Ticket } from '../types';
import { ModalsComponent } from './Modals';
import { showToast } from './Toast';

export class EditTicketModal {
    private static submitBound = false;
    private static currentTicketId = '';
    private static onSaveCallback: () => void = () => {};

    public static async open(ticket: Ticket, onSave: () => void): Promise<void> {
        this.currentTicketId = ticket.id;
        this.onSaveCallback = onSave;

        const statusSelect = document.getElementById('edit-ticket-status') as HTMLSelectElement;
        const severitySelect = document.getElementById('edit-ticket-severity') as HTMLSelectElement;
        const prioritySelect = document.getElementById('edit-ticket-priority') as HTMLSelectElement;
        const assigneeSelect = document.getElementById('edit-ticket-assignee') as HTMLSelectElement;
        const dueInput = document.getElementById('edit-ticket-due') as HTMLInputElement;

        if (statusSelect) statusSelect.value = ticket.status;
        if (severitySelect) severitySelect.value = ticket.severity;
        if (prioritySelect) prioritySelect.value = ticket.priority;

        // Fetch IT Support users dynamically
        if (assigneeSelect) {
            assigneeSelect.innerHTML = '<option value="Unassigned">Unassigned</option>';
            try {
                const agents = await usersAPI.getByRole('it-support');
                agents.forEach(agent => {
                    const opt = document.createElement('option');
                    opt.value = agent.fullName;
                    opt.textContent = agent.fullName;
                    assigneeSelect.appendChild(opt);
                });
                assigneeSelect.value = ticket.assignee || 'Unassigned';
            } catch (err) {
                console.error('Failed to load agents for assignment:', err);
            }
        }

        // Format date/time local for input value (YYYY-MM-DDTHH:MM)
        if (dueInput) {
            if (ticket.dueAt) {
                try {
                    const date = new Date(ticket.dueAt);
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

        this.initFormSubmit();
        ModalsComponent.openModal('edit-ticket-modal');
    }

    private static initFormSubmit(): void {
        if (this.submitBound) return;
        this.submitBound = true;

        const form = document.getElementById('edit-ticket-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-edit-modal-btn');

        cancelBtn?.addEventListener('click', () => {
            ModalsComponent.closeModal('edit-ticket-modal');
        });

        form?.addEventListener('submit', async e => {
            e.preventDefault();

            const statusSelect = document.getElementById('edit-ticket-status') as HTMLSelectElement;
            const severitySelect = document.getElementById(
                'edit-ticket-severity',
            ) as HTMLSelectElement;
            const prioritySelect = document.getElementById(
                'edit-ticket-priority',
            ) as HTMLSelectElement;
            const assigneeSelect = document.getElementById(
                'edit-ticket-assignee',
            ) as HTMLSelectElement;
            const dueInput = document.getElementById('edit-ticket-due') as HTMLInputElement;

            const user = store.getState().currentUser;
            const changedBy = user ? user.username : 'Admin';

            let dueAt: string | undefined = undefined;
            if (dueInput && dueInput.value) {
                dueAt = new Date(dueInput.value).toISOString();
            }

            try {
                await ticketsAPI.update(this.currentTicketId, {
                    status: statusSelect.value,
                    severity: severitySelect.value,
                    priority: prioritySelect.value,
                    assignee: assigneeSelect.value,
                    dueAt: dueAt || '',
                    changedBy,
                });

                showToast('Ticket updated successfully', 'success');
                ModalsComponent.closeModal('edit-ticket-modal');
                this.onSaveCallback();
            } catch (err: any) {
                showToast(err.message || 'Failed to update ticket', 'error');
            }
        });
    }
}
