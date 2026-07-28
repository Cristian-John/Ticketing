import { LogoutIcon } from '../common/Icons';

export class LogoutConfirmModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'logout-confirm-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';
        modal.style.maxWidth = '360px';
        modal.style.textAlign = 'center';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${LogoutIcon({ size: 20 })}
                Log out?
            </h3>
        `;
        modal.appendChild(header);

        const body = document.createElement('div');
        body.className = 'modal-body text-center';
        body.innerHTML = `
            <p style="color: var(--text-secondary); margin-bottom: 24px;">Are you sure you want to log out of your account?</p>
            <div class="modal-actions centered">
                <button type="button" class="btn btn-ghost" id="cancel-logout-btn">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirm-logout-btn" style="background-color: var(--severity-severe); border-color: var(--severity-severe);">Log Out</button>
            </div>
        `;
        
        modal.appendChild(body);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
