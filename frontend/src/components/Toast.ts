import { TransitionLifecycle } from '../utils/TransitionLifecycle';

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    
    // Begin opening lifecycle
    TransitionLifecycle.open(toast, { timeoutMs: 400 });

    setTimeout(() => {
        // Begin closing lifecycle, and physically remove DOM node when done
        TransitionLifecycle.close(toast, { 
            timeoutMs: 400,
            onCleanup: () => toast.remove() 
        });
    }, 4000);
}
