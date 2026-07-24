import { store } from '../state/store';
import { Router } from '../router/router';
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
            if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
            if (label) label.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';
        });
    }

    public static initThemeToggle(): void {
        const stored = localStorage.getItem(THEME_KEY);
        const theme: 'dark' | 'light' = stored === 'light' ? 'light' : 'dark';
        this.applyTheme(theme);

        const toggleTheme = () => {
            const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            this.applyTheme(current === 'dark' ? 'light' : 'dark');
        };

        document.getElementById('global-theme-toggle')?.addEventListener('click', toggleTheme);
    }

    public static initUserBadge(): void {
        const updateBadge = () => {
            const user = store.getState().currentUser;
            const displayName = user ? (user.fullName || user.username) : 'User';
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
        const handleLogout = () => {
            Router.logout();
            showToast('Logged out successfully', 'info');
        };

        document.getElementById('client-logout-btn')?.addEventListener('click', handleLogout);
        document.getElementById('admin-logout-btn')?.addEventListener('click', handleLogout);
    }
}
