import './style.css';
import { store } from './state/store';
import { Router } from './router/router';
import { NavbarComponent } from './components/Navbar';
import { SidebarComponent } from './components/Sidebar';
import { ModalsComponent } from './components/Modals';
import { LoginPage } from './pages/Login';
import { CreateTicketPage } from './pages/CreateTicket';
import { ArticlesPage } from './pages/Articles';

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
                    authAPI.validate(session.token).then(res => {
                        if (res.success) {
                            store.setSession(res.user, true);
                            Router.enterPortal();
                        } else {
                            store.setSession(null);
                            Router.showScreen('login-screen');
                        }
                    }).catch(() => {
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
