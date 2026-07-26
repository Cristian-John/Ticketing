import './style.css';

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
                            if (res.success) {
                                store.setSession(res.user, true);
                                Router.enterPortal();
                            } else {
                                store.setSession(null);
                                Router.showScreen('login-screen');
                            }
                        })
                        .catch(() => {
                            store.setSession(null);
                            Router.showScreen('login-screen');
                        });
                });
            } else {
                Router.showScreen('login-screen');
            }
        });
    }
}

App.init();
