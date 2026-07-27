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
    private static showSplash(): void {
        document.body.style.overflow = 'hidden';
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('active');
        const login = document.getElementById('login-screen');
        if (login) login.classList.remove('active');
    }

    private static hideSplash(): void {
        document.body.style.overflow = '';
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.remove('active');
    }

    public static init(): void {
        document.addEventListener('DOMContentLoaded', () => {
            // Ensure splash is visible
            this.showSplash();

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
                            this.hideSplash();
                            if (res.success) {
                                store.setSession(res.user, true);
                                Router.enterPortal();
                            } else {
                                store.setSession(null);
                                Router.showScreen('login-screen');
                            }
                        })
                        .catch(() => {
                            this.hideSplash();
                            store.setSession(null);
                            Router.showScreen('login-screen');
                        });
                });
            } else {
                this.hideSplash();
                Router.showScreen('login-screen');
            }
        });
    }
}

App.init();
