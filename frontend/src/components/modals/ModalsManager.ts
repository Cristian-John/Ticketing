import { ArticleModal } from './ArticleModal';
import { EditTicketModal } from './EditTicketModal';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { RatingModal } from './RatingModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { TicketModal } from './TicketModal';
import { TransferTicketModal } from './TransferTicketModal';
import { UpdateStatusModal } from './UpdateStatusModal';
import { AddCollaboratorModal } from './AddCollaboratorModal';
import { UserModal } from './UserModal';
import { ViewTicketModal } from './ViewTicketModal';

export class ModalsManager {
    /**
     * Replaces legacy modals in the DOM with instances of the new TypeScript modals.
     */
    public static initializeModals(): void {
        const root = document.getElementById('modal-root');
        if (!root) {
            console.error('modal-root not found in the DOM.');
            return;
        }

        const appendModal = (ModalClass: any) => {
            const modalInstance = new ModalClass();
            root.appendChild(modalInstance.getElement());
        };

        appendModal(TicketModal);
        appendModal(ViewTicketModal);
        appendModal(EditTicketModal);
        appendModal(UserModal);
        appendModal(ResetPasswordModal);
        appendModal(RatingModal);
        appendModal(ArticleModal);
        appendModal(LogoutConfirmModal);
        appendModal(UpdateStatusModal);
        appendModal(TransferTicketModal);
        appendModal(AddCollaboratorModal);

        // Bind global close listeners to the new modals
        this.initModalCloseListeners();
    }
    /**
     * Opens a modal by adding the 'show' class to its overlay element.
     */
    public static openModal(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');
    }

    /**
     * Closes a modal by removing the 'show' class from its overlay element.
     */
    public static closeModal(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }

    /**
     * Initializes global event listeners for closing modals.
     * Binds click events to .modal-close buttons and .modal-overlay backgrounds.
     */
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
}
