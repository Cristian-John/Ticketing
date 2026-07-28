export class ModalsManager {
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
