import './style.css';
import './bootstrap/serviceWorkerCleanup';

import { SplashManager } from './components/common/SplashManager';
import { ThemeManager } from './components/common/theme/ThemeManager';
import { ModalsComponent } from './components/Modals';
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

            NavbarComponent.init();
            SidebarComponent.init();
            ModalsComponent.initModalCloseListeners();

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
