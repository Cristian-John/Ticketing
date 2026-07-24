import { HtmlViewName } from './router/router';
import { store } from './state/store';
import { renderPlaceholder } from './utils/portalContent';
import { DashboardPage } from './pages/Dashboard';
import { TicketsPage } from './pages/Tickets';
import { ArticlesPage } from './pages/Articles';
import { UsersPage } from './pages/Users';
import { ProfilePage } from './pages/Profile';

export function loadPageForHtmlView(htmlView: string): void {
    if (!store.getState().currentUser) return;

    switch (htmlView as HtmlViewName) {
        case 'dashboard':
            DashboardPage.load();
            break;
        case 'my-tickets':
        case 'all-tickets':
        case 'resolved':
            TicketsPage.load(htmlView as HtmlViewName);
            break;
        case 'knowledge-base':
            ArticlesPage.load();
            break;
        case 'users':
            UsersPage.load();
            break;
        case 'profile':
            ProfilePage.load();
            break;
        default:
            renderPlaceholder('This section is coming soon.');
    }
}
