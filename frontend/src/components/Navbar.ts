import { Router } from '../router/router';
import { store } from '../state/store';
import { ModalsComponent } from './Modals';
import { showToast } from './Toast';

const THEME_KEY = 'itsupport_theme';

export class NavbarComponent {
    public static init(): void {
        this.initThemeToggle();
        this.initUserBadge();
        this.initLogout();
    }

    private static applyTheme(theme: 'dark' | 'light'): void {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);

        document.querySelectorAll('.theme-toggle').forEach(btn => {
            const icon = btn.querySelector('.theme-icon');
            const label = btn.querySelector('span:last-child');
            if (icon)
                icon.innerHTML =
                    theme === 'light'
                        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
                        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
            if (label) label.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';
        });
    }

    public static initThemeToggle(): void {
        const stored = localStorage.getItem(THEME_KEY);
        const theme: 'dark' | 'light' = stored === 'light' ? 'light' : 'dark';
        this.applyTheme(theme);

        const toggleTheme = () => {
            const current =
                document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            this.applyTheme(current === 'dark' ? 'light' : 'dark');
        };

        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.addEventListener('click', toggleTheme);
        });
    }

    public static initUserBadge(): void {
        const updateBadge = () => {
            const user = store.getState().currentUser;
            const displayName = user ? user.fullName || user.username : 'User';
            const clientName = document.getElementById('client-sidebar-name');
            if (clientName) {
                clientName.textContent = displayName;
            }
            const adminName = document.getElementById('admin-sidebar-name');
            if (adminName) {
                adminName.textContent = displayName;
            }
        };

        store.subscribeToSession(updateBadge);
        updateBadge();
    }

    private static initLogout(): void {
        const handleLogoutClick = () => {
            ModalsComponent.openModal('logout-confirm-modal');
        };

        document.getElementById('client-logout-btn')?.addEventListener('click', handleLogoutClick);
        document.getElementById('admin-logout-btn')?.addEventListener('click', handleLogoutClick);

        document.getElementById('cancel-logout-btn')?.addEventListener('click', () => {
            ModalsComponent.closeModal('logout-confirm-modal');
        });

        document.getElementById('confirm-logout-btn')?.addEventListener('click', () => {
            ModalsComponent.closeModal('logout-confirm-modal');
            Router.logout();
            showToast('Logged out successfully', 'info');
        });
    }
}
