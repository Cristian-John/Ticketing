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
            <div class="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}
