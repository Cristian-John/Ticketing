import { ModalsManager } from './ModalsManager';
import { showToast } from '../Toast';
import { store } from '../../state/store';

export class NotificationPreferencesModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'notification-preferences-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';
        modal.style.maxWidth = '480px';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                <i data-lucide="settings" style="width: 20px; height: 20px;"></i>
                Notification Preferences
            </h3>
            <button class="modal-close" aria-label="Close" type="button">&times;</button>
        `;
        modal.appendChild(header);

        const body = document.createElement('div');
        body.className = 'modal-body';
            const defaultPrefs = { email: true, push: true, transfers: true, collab: true, comments: true, assignments: true, system: true };
            const savedPrefsStr = localStorage.getItem('notification_preferences');
            const prefs = savedPrefsStr ? { ...defaultPrefs, ...JSON.parse(savedPrefsStr) } : defaultPrefs;
            const isChecked = (val: boolean) => val ? 'checked' : '';
            const isClient = store.getState().currentUser?.role === 'client';

            body.innerHTML = `
                <style>
                    .pref-modal-title { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
                    .pref-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
                    .pref-item:last-child { border-bottom: none; }
                    .pref-info { display: flex; flex-direction: column; gap: 4px; padding-right: 16px; }
                    .pref-name { font-weight: 500; font-size: 0.95rem; color: var(--text-primary); text-transform: none; }
                    .pref-desc { font-size: 0.8rem; color: var(--text-secondary); text-transform: none; }
                    
                    /* Toggle Switch */
                    .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; margin: 0; }
                    .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
                    .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-surface); transition: .2s; border-radius: 24px; border: 1px solid var(--border-color); }
                    .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: var(--text-secondary); transition: .2s; border-radius: 50%; }
                    .toggle-switch input:checked + .toggle-slider { background-color: var(--accent); border-color: var(--accent); }
                    .toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); background-color: #fff; }
                    
                    .pref-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
                </style>

                <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.9rem;">
                    Customize how and when you want to receive notifications across the ticketing system.
                </p>

                <div style="margin-bottom: 32px;">
                    <div class="pref-modal-title">Notification Channels</div>
                    
                    <div class="pref-item">
                        <div class="pref-info">
                            <span class="pref-name">Email Notifications</span>
                            <span class="pref-desc">Receive critical updates directly in your inbox</span>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" ${isChecked(prefs.email)} id="pref-email">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div class="pref-item">
                        <div class="pref-info">
                            <span class="pref-name">In-App Push</span>
                            <span class="pref-desc">Receive real-time alerts while the app is open</span>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" ${isChecked(prefs.push)} id="pref-push">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <div style="margin-bottom: 32px;">
                    <div class="pref-modal-title">Notification Categories</div>
                    
                    <div class="pref-grid">
                        ${!isClient ? `
                        <div class="pref-item">
                            <span class="pref-name">Transfers</span>
                            <label class="toggle-switch">
                                <input type="checkbox" ${isChecked(prefs.transfers)} id="pref-cat-transfers">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="pref-item">
                            <span class="pref-name">Collaboration</span>
                            <label class="toggle-switch">
                                <input type="checkbox" ${isChecked(prefs.collab)} id="pref-cat-collab">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="pref-item">
                            <span class="pref-name">Assignments</span>
                            <label class="toggle-switch">
                                <input type="checkbox" ${isChecked(prefs.assignments)} id="pref-cat-assignments">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        ` : ''}
                        <div class="pref-item">
                            <span class="pref-name">${isClient ? 'Replies' : 'Comments'}</span>
                            <label class="toggle-switch">
                                <input type="checkbox" ${isChecked(prefs.comments)} id="pref-cat-comments">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="pref-item">
                            <span class="pref-name">${isClient ? 'Ticket Status & Alerts' : 'System Alerts'}</span>
                            <label class="toggle-switch">
                                <input type="checkbox" ${isChecked(prefs.system)} id="pref-cat-system">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

            <div class="modal-actions" style="margin-top: 16px;">
                <button type="button" class="btn btn-ghost" id="cancel-preferences-btn">Cancel</button>
                <button type="button" class="btn btn-primary" id="save-preferences-btn">Save Preferences</button>
            </div>
        `;
        
        modal.appendChild(body);
        this.element.appendChild(modal);

        this.attachEvents();
    }

    private attachEvents(): void {
        const cancelBtn = this.element.querySelector('#cancel-preferences-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                ModalsManager.closeModal('notification-preferences-modal');
            });
        }

        const saveBtn = this.element.querySelector('#save-preferences-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const email = (this.element.querySelector('#pref-email') as HTMLInputElement)?.checked;
                const push = (this.element.querySelector('#pref-push') as HTMLInputElement)?.checked;
                const transfers = (this.element.querySelector('#pref-cat-transfers') as HTMLInputElement)?.checked ?? true;
                const collab = (this.element.querySelector('#pref-cat-collab') as HTMLInputElement)?.checked ?? true;
                const comments = (this.element.querySelector('#pref-cat-comments') as HTMLInputElement)?.checked ?? true;
                const assignments = (this.element.querySelector('#pref-cat-assignments') as HTMLInputElement)?.checked ?? true;
                const system = (this.element.querySelector('#pref-cat-system') as HTMLInputElement)?.checked ?? true;
                
                const prefs = { email, push, transfers, collab, comments, assignments, system };
                localStorage.setItem('notification_preferences', JSON.stringify(prefs));

                showToast('Notification preferences saved successfully', 'success');
                ModalsManager.closeModal('notification-preferences-modal');
            });
        }
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
