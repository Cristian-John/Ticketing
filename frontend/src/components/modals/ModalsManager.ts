import { ArticleModal } from './ArticleModal';
import { EditTicketModal } from './EditTicketModal';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { RatingModal } from './RatingModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { TicketModal } from './TicketModal';
import { UserModal } from './UserModal';
import { ViewTicketModal } from './ViewTicketModal';

export class ModalsManager {
    /**
     * Replaces legacy modals in the DOM with instances of the new TypeScript modals.
     */
    public static initializeModals(): void {
        const replaceModal = (id: string, ModalClass: any) => {
            const legacyModal = document.getElementById(id);
            if (legacyModal) {
                legacyModal.replaceWith(new ModalClass().getElement());
            }
        };

        replaceModal('ticket-modal', TicketModal);
        replaceModal('view-ticket-modal', ViewTicketModal);
        replaceModal('edit-ticket-modal', EditTicketModal);
        replaceModal('user-modal', UserModal);
        replaceModal('reset-password-modal', ResetPasswordModal);
        replaceModal('rating-modal', RatingModal);
        replaceModal('article-modal', ArticleModal);
        replaceModal('logout-confirm-modal', LogoutConfirmModal);

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
