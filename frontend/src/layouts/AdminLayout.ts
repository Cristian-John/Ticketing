import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';
import { adminSidebarConfig } from '../components/navigation/configs/adminSidebarConfig';

export class AdminLayout {
    private element: HTMLDivElement;
    private sidebar: Sidebar;
    private topbar: Topbar;
    private contentArea: HTMLDivElement;
    private overlay: HTMLDivElement;
    private notifBanner: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.id = 'admin-screen';
        this.element.className = 'screen';

        const appShell = document.createElement('div');
        appShell.className = 'app-shell';

        // Notification Banner
        this.notifBanner = document.createElement('div');
        this.notifBanner.className = 'notif-banner';
        this.notifBanner.style.display = 'none';
        this.notifBanner.innerHTML = `
            <span></span>
            <button class="notif-close">&times;</button>
        `;
        appShell.appendChild(this.notifBanner);

        // Sidebar
        this.sidebar = new Sidebar(adminSidebarConfig);
        appShell.appendChild(this.sidebar.getElement());

        // Sidebar Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'sidebar-overlay';
        this.overlay.id = 'admin-sidebar-overlay';
        appShell.appendChild(this.overlay);

        // Main Area
        const mainArea = document.createElement('div');
        mainArea.className = 'main-area';

        // Topbar
        this.topbar = new Topbar({
            titleId: 'admin-page-title',
            toggleId: 'admin-sidebar-toggle',
            title: 'Dashboard', // default
            onToggleSidebar: () => this.toggleSidebar()
        });
        mainArea.appendChild(this.topbar.getElement());

        // Content Area
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'content-area';
        this.contentArea.id = 'admin-content';
        mainArea.appendChild(this.contentArea);

        appShell.appendChild(mainArea);
        this.element.appendChild(appShell);

        // Bind overlay click
        this.overlay.addEventListener('click', () => this.closeSidebar());
        
        // Bind notification close
        const closeBtn = this.notifBanner.querySelector('.notif-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.notifBanner.style.display = 'none';
            });
        }
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

    public showNotification(message: string): void {
        const span = this.notifBanner.querySelector('span');
        if (span) {
            span.textContent = message;
        }
        this.notifBanner.style.display = 'flex';
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
