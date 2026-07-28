import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';
import { clientSidebarConfig } from '../components/navigation/configs/clientSidebarConfig';

export class ClientLayout {
    private element: HTMLDivElement;
    private sidebar: Sidebar;
    private topbar: Topbar;
    private contentArea: HTMLDivElement;
    private overlay: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.id = 'client-screen';
        this.element.className = 'screen';

        const appShell = document.createElement('div');
        appShell.className = 'app-shell';

        // Sidebar
        this.sidebar = new Sidebar(clientSidebarConfig);
        appShell.appendChild(this.sidebar.getElement());

        // Sidebar Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'sidebar-overlay';
        this.overlay.id = 'client-sidebar-overlay';
        appShell.appendChild(this.overlay);

        // Main Area
        const mainArea = document.createElement('div');
        mainArea.className = 'main-area';

        // Topbar
        this.topbar = new Topbar({
            titleId: 'client-page-title',
            toggleId: 'client-sidebar-toggle',
            title: 'My Tickets', // default
            onToggleSidebar: () => this.toggleSidebar()
        });
        mainArea.appendChild(this.topbar.getElement());

        // Content Area
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'content-area';
        this.contentArea.id = 'client-content';
        mainArea.appendChild(this.contentArea);

        appShell.appendChild(mainArea);
        this.element.appendChild(appShell);

        // Bind overlay click
        this.overlay.addEventListener('click', () => this.closeSidebar());
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public getSidebar(): Sidebar {
        return this.sidebar;
    }

    public getTopbar(): Topbar {
        return this.topbar;
    }

    public getContentArea(): HTMLElement {
        return this.contentArea;
    }

    private toggleSidebar(): void {
        const sb = this.sidebar.getElement();
        if (sb.classList.contains('active')) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    private openSidebar(): void {
        this.sidebar.getElement().classList.add('active');
        this.overlay.classList.add('active');
    }

    private closeSidebar(): void {
        this.sidebar.getElement().classList.remove('active');
        this.overlay.classList.remove('active');
    }
}
