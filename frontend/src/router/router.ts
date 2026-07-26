import { store } from '../state/store';
import { loadPageForHtmlView } from '../pageLoader';
import { authAPI } from '../services/api';

export type ScreenId = 'login-screen' | 'client-screen' | 'admin-screen';
export type Portal = 'client' | 'admin';

/** HTML sidebar data-view values used in index.html */
export type HtmlViewName =
    | 'my-tickets'
    | 'knowledge-base'
    | 'dashboard'
    | 'all-tickets'
    | 'resolved'
    | 'users'
    | 'profile';

const VIEW_TITLES: Record<HtmlViewName, { client?: string; admin?: string }> = {
    'my-tickets': { client: 'My Tickets' },
    'knowledge-base': { client: 'Knowledge Base', admin: 'Knowledge Base' },
    dashboard: { admin: 'Dashboard' },
    'all-tickets': { admin: 'All Tickets' },
    resolved: { admin: 'Resolved & Ratings' },
    users: { admin: 'User Management' },
    profile: { client: 'My Profile', admin: 'My Profile' },
};

/** Maps HTML nav view names to store currentView keys (unchanged store API). */
const HTML_TO_STORE_VIEW: Record<HtmlViewName, string> = {
    dashboard: 'dashboard',
    'all-tickets': 'tickets',
    resolved: 'tickets',
    'my-tickets': 'tickets',
    'knowledge-base': 'kb',
    users: 'users',
    profile: 'profile',
};

export class Router {
    public static showScreen(screenId: ScreenId): void {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId)?.classList.add('active');
    }

    public static enterClient(defaultView: HtmlViewName = 'my-tickets'): void {
        const user = store.getState().currentUser;
        const nameEl = document.getElementById('client-sidebar-name');
        if (nameEl && user) {
            nameEl.textContent = user.fullName || user.username;
        }

        this.showScreen('client-screen');
        this.switchView(defaultView, 'client');
    }

    public static enterAdmin(defaultView: HtmlViewName = 'dashboard'): void {
        const user = store.getState().currentUser;
        const nameEl = document.getElementById('admin-sidebar-name');
        if (nameEl && user) {
            nameEl.textContent = user.fullName || user.username;
        }

        // Show/hide Users tab in admin sidebar based on admin role
        const usersTab = document.getElementById('admin-nav-users');
        if (usersTab) {
            usersTab.style.display = user && user.role === 'admin' ? 'block' : 'none';
        }

        this.showScreen('admin-screen');
        this.switchView(defaultView, 'admin');
    }

    public static enterPortal(): void {
        const user = store.getState().currentUser;
        if (!user) {
            this.showScreen('login-screen');
            return;
        }

        if (user.role === 'admin' || user.role === 'it-support') {
            this.enterAdmin('dashboard');
        } else {
            this.enterClient('my-tickets');
        }
    }

    public static switchView(htmlViewName: string, portal?: Portal): void {
        const user = store.getState().currentUser;
        const resolvedPortal: Portal =
            portal ?? ((user?.role === 'admin' || user?.role === 'it-support') ? 'admin' : 'client');

        const sidebarId = resolvedPortal === 'admin' ? 'admin-sidebar' : 'client-sidebar';
        const sidebar = document.getElementById(sidebarId);
        sidebar?.querySelectorAll('.sb-nav-btn').forEach(btn => {
            const view = btn.getAttribute('data-view');
            btn.classList.toggle('active', view === htmlViewName);
        });

        const titleId = resolvedPortal === 'admin' ? 'admin-page-title' : 'client-page-title';
        const titleEl = document.getElementById(titleId);
        if (titleEl) {
            const titles = VIEW_TITLES[htmlViewName as HtmlViewName];
            titleEl.textContent =
                titles?.[resolvedPortal] ?? htmlViewName.replace(/-/g, ' ');
        }

        if (resolvedPortal === 'admin') {
            const filters = document.getElementById('admin-filters');
            if (filters) {
                filters.style.display = htmlViewName === 'all-tickets' ? '' : 'none';
            }
            const userFilters = document.getElementById('admin-users-filters');
            if (userFilters) {
                userFilters.style.display = htmlViewName === 'users' ? '' : 'none';
            }
        }

        const storeView =
            HTML_TO_STORE_VIEW[htmlViewName as HtmlViewName] ?? htmlViewName;
        store.setView(storeView, { force: true });
        loadPageForHtmlView(htmlViewName);
    }

    public static logout(): void {
        const user = store.getState().currentUser;
        if (user) {
            authAPI.logout(user.token).catch(() => {});
        }
        store.setSession(null);
        this.showScreen('login-screen');
    }
}
