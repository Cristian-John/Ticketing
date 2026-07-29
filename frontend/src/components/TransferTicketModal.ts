import { ticketsAPI, usersAPI } from '../services/api';
import { Ticket } from '../types';
import { createElement } from '../utils/dom';
import { handleUIError } from '../utils/errorHandler';
import { ModalsManager } from './modals/ModalsManager';
import { showToast } from './Toast';

export class TransferTicketModal {
    private ticket: Ticket;
    private onSaveCallback: () => void;
    private boundSubmitHandler?: (e: Event) => void;
    private boundCancelHandler?: () => void;
    
    constructor(ticket: Ticket, onSave: () => void) {
        this.ticket = ticket;
        this.onSaveCallback = onSave;
        const modal = document.getElementById('transfer-ticket-modal');
        if (!modal) throw new Error('Transfer Ticket modal not found');
    }

    public async open(): Promise<void> {
        this.destroy();
        await this.create();
        this.attachEvents();
        ModalsManager.openModal('transfer-ticket-modal');
    }

    private async create(): Promise<void> {
        const select = document.getElementById('transfer-user-select') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '';
        select.appendChild(createElement('option', { attributes: { value: '', disabled: 'true', selected: 'true' }, textContent: 'Select a technician...' }));

        try {
            const agents = await usersAPI.getByRole('it-support');
            agents.forEach(agent => {
                // Do not allow transferring to themselves (since they already own it)
                if (this.ticket.primary_assignee_id === agent.id) return;
                
                select.appendChild(createElement('option', { 
                    attributes: { value: agent.id }, 
                    textContent: `${agent.fullName} (${agent.username})` 
                }));
            });
        } catch (err) {
            console.error('Failed to load agents for transfer selection:', err);
            select.innerHTML = '';
            select.appendChild(createElement('option', { attributes: { value: '', disabled: 'true', selected: 'true' }, textContent: 'Failed to load technicians' }));
        }
    }

    private attachEvents(): void {
        const form = document.getElementById('transfer-ticket-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-transfer-btn');

        if (cancelBtn) {
            this.boundCancelHandler = () => {
                ModalsManager.closeModal('transfer-ticket-modal');
            };
            cancelBtn.addEventListener('click', this.boundCancelHandler);
        }

        if (form) {
            this.boundSubmitHandler = async (e: Event) => {
                e.preventDefault();

                const select = document.getElementById('transfer-user-select') as HTMLSelectElement;
                const reasonInput = document.getElementById('transfer-reason') as HTMLInputElement;
                const collabCheckbox = document.getElementById('transfer-remain-collab') as HTMLInputElement;
                
                const targetUserId = select.value;
                const reason = reasonInput.value;
                const remainCollaborator = collabCheckbox.checked;

                if (!targetUserId) {
                    showToast('Please select a target technician.', 'error');
                    return;
                }

                try {
                    await ticketsAPI.transfer(this.ticket.id, { targetUserId, reason, remainCollaborator });
                    showToast('Ticket transferred successfully', 'success');
                    ModalsManager.closeModal('transfer-ticket-modal');
                    this.onSaveCallback();
                } catch (err: unknown) {
                    handleUIError(err, 'Failed to transfer ticket');
                }
            };
            form.addEventListener('submit', this.boundSubmitHandler);
        }
    }

    public destroy(): void {
        const form = document.getElementById('transfer-ticket-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-transfer-btn');

        if (cancelBtn && this.boundCancelHandler) {
            cancelBtn.removeEventListener('click', this.boundCancelHandler);
        }
        if (form && this.boundSubmitHandler) {
            form.removeEventListener('submit', this.boundSubmitHandler);
        }
    }
}
