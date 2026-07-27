import './style.css';

import { ModalsComponent } from './components/Modals';
import { NavbarComponent } from './components/Navbar';
import { SidebarComponent } from './components/Sidebar';
import { ArticlesPage } from './pages/Articles';
import { CreateTicketPage } from './pages/CreateTicket';
import { LoginPage } from './pages/Login';
import { Router } from './router/router';
import { store } from './state/store';
import { LoadingManager } from './utils/loadingManager';

class App {
    public static init(): void {
        document.addEventListener('DOMContentLoaded', () => {
            // Ensure splash is visible
            LoadingManager.showSplash();

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
                            LoadingManager.hideSplash();
                            if (res.success) {
                                store.setSession(res.user, true);
                                Router.enterPortal();
                            } else {
                                store.setSession(null);
                                Router.showScreen('login-screen');
                            }
                        })
                        .catch(() => {
                            LoadingManager.hideSplash();
                            store.setSession(null);
                            Router.showScreen('login-screen');
                        });
                });
            } else {
                LoadingManager.hideSplash();
                Router.showScreen('login-screen');
            }
        });
    }
}

App.init();
