import { store } from '../state/store';
import { escapeHTML } from './formatters';

export function getPortalContentContainer(): HTMLElement | null {
    const user = store.getState().currentUser;
    if (!user) return null;
    const id = (user.role === 'admin' || user.role === 'it-support') ? 'admin-content' : 'client-content';
    return document.getElementById(id);
}

export function clearPortalContent(): HTMLElement | null {
    const container = getPortalContentContainer();
    if (container) {
        container.innerHTML = '';
    }
    return container;
}

export function renderPlaceholder(message: string): void {
    const container = clearPortalContent();
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📄</div>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}
