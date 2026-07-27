import { ArticlesPage } from './pages/Articles';
import { DashboardPage } from './pages/Dashboard';
import { ProfilePage } from './pages/Profile';
import { TicketsPage } from './pages/Tickets';
import { UsersPage } from './pages/Users';
import { HtmlViewName } from './router/router';
import { store } from './state/store';
import { getPortalContentContainer, renderPlaceholder } from './utils/portalContent';

export async function loadPageForHtmlView(htmlView: string): Promise<void> {
    const user = store.getState().currentUser;
    if (!user) return;

    const container = getPortalContentContainer(user.role);
    if (!container) return;

    switch (htmlView as HtmlViewName) {
        case 'dashboard':
            await DashboardPage.load();
            break;
        case 'my-tickets':
        case 'all-tickets':
        case 'resolved':
            await TicketsPage.load(htmlView as HtmlViewName);
            break;
        case 'knowledge-base':
            await ArticlesPage.load();
            break;
        case 'users':
            await UsersPage.load();
            break;
        case 'profile':
            await ProfilePage.load();
            break;
        default:
            renderPlaceholder(user.role, 'This section is coming soon.');
    }
}
