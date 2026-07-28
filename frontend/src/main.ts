import './style.css';
import './bootstrap/serviceWorkerCleanup';

import { SplashManager } from './components/common/SplashManager';
import { ThemeManager } from './components/common/theme/ThemeManager';
import { AdminLayout } from './layouts/AdminLayout';
import { ClientLayout } from './layouts/ClientLayout';
import { LoginLayout } from './layouts/LoginLayout';
import { LayoutManager } from './layouts/LayoutManager';
import { ModalsManager } from './components/modals/ModalsManager';
import { NavbarComponent } from './components/Navbar';
import { SidebarComponent } from './components/Sidebar';
import { ArticlesPage } from './pages/Articles';
import { CreateTicketPage } from './pages/CreateTicket';
import { LoginPage } from './pages/Login';
import { Router } from './router/router';
import { store } from './state/store';

class App {
    public static init(): void {
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize foundational modules
            ThemeManager.initialize();
            
            // Ensure splash is visible
            SplashManager.show();

            // Setup Layouts
            const legacyLogin = document.getElementById('login-screen');
            const loginForm = document.getElementById('login-form');
            if (legacyLogin && loginForm) {
                LayoutManager.login = new LoginLayout();
                LayoutManager.login.appendContent(loginForm);
                legacyLogin.replaceWith(LayoutManager.login.getElement());
            }

            const legacyClient = document.getElementById('client-screen');
            if (legacyClient) {
                LayoutManager.client = new ClientLayout();
                legacyClient.replaceWith(LayoutManager.client.getElement());
            }

            const legacyAdmin = document.getElementById('admin-screen');
            if (legacyAdmin) {
                LayoutManager.admin = new AdminLayout();
                
                // Preserve legacy filters by moving them to the new topbar
                const adminFilters = document.getElementById('admin-filters');
                if (adminFilters) {
                    LayoutManager.admin.getTopbar().appendAction(adminFilters);
                }
                const usersFilters = document.getElementById('admin-users-filters');
                if (usersFilters) {
                    LayoutManager.admin.getTopbar().appendAction(usersFilters);
                }

                legacyAdmin.replaceWith(LayoutManager.admin.getElement());
            }

            ModalsManager.initializeModals();

            NavbarComponent.init();
            SidebarComponent.init();

            LoginPage.init();
            CreateTicketPage.init();
            ArticlesPage.init();

            const session = store.loadSession();
            if (session) {
                import('./services/api').then(({ authAPI }) => {
                    authAPI
                        .validate(session.token)
                        .then(res => {
                            SplashManager.hide();
                            if (res.success) {
                                store.setSession(res.user, true);
                                Router.enterPortal();
                            } else {
                                store.setSession(null);
                                Router.showScreen('login-screen');
                            }
                        })
                        .catch(() => {
                            SplashManager.hide();
                            store.setSession(null);
                            Router.showScreen('login-screen');
                        });
                });
            } else {
                SplashManager.hide();
                Router.showScreen('login-screen');
            }
        });
    }
}

App.init();
