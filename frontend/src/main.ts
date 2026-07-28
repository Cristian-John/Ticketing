import './style.css';

import { cleanupServiceWorkers } from './bootstrap/serviceWorkerCleanup';
import { HexagonBackground } from './components/background/HexagonBackground';
import { SplashManager } from './components/common/SplashManager';
import { ThemeManager } from './components/common/theme/ThemeManager';
import { ModalsManager } from './components/modals/ModalsManager';
import { AdminLayout } from './layouts/AdminLayout';
import { ClientLayout } from './layouts/ClientLayout';
import { LayoutManager } from './layouts/LayoutManager';
import { LoginLayout } from './layouts/LoginLayout';
import { ArticlesPage } from './pages/Articles';
import { CreateTicketPage } from './pages/CreateTicket';
import { LoginPage } from './pages/Login';
import { Router } from './router/router';
import { store } from './state/store';

class App {
    public static init(): void {
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize foundational modules
            cleanupServiceWorkers();
            ThemeManager.initialize();
            HexagonBackground.init();
            
            // Ensure splash is visible
            SplashManager.show();

            // Setup Layouts
            const legacyLogin = document.getElementById('login-screen');
            if (legacyLogin) {
                LayoutManager.login = new LoginLayout();
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
