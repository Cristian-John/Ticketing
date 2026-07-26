import { ArticlesPage } from './pages/Articles';
import { DashboardPage } from './pages/Dashboard';
import { ProfilePage } from './pages/Profile';
import { TicketsPage } from './pages/Tickets';
import { UsersPage } from './pages/Users';
import { HtmlViewName } from './router/router';
import { store } from './state/store';
import { renderPlaceholder } from './utils/portalContent';

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
