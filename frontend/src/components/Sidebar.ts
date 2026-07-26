import { Router } from '../router/router';
import { store } from '../state/store';
import { DEPARTMENTS } from '../utils/formatters';

export class SidebarComponent {
    public static init(): void {
        this.initNavTabs();
        this.initSidebarToggles();
        this.renderDepartmentFilters();
    }

    private static initNavTabs(): void {
        const clientSidebar = document.getElementById('client-sidebar');
        clientSidebar?.querySelectorAll('.sb-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                if (view) {
                    Router.switchView(view, 'client');
                }
            });
        });

        const adminSidebar = document.getElementById('admin-sidebar');
        adminSidebar?.querySelectorAll('.sb-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                if (view) {
                    Router.switchView(view, 'admin');
                }
            });
        });
    }

    private static initSidebarToggles(): void {
        this.setupSidebarToggle(
            'client-sidebar-toggle',
            'client-sidebar',
            'client-sidebar-overlay',
        );
        this.setupSidebarToggle('admin-sidebar-toggle', 'admin-sidebar', 'admin-sidebar-overlay');
    }

    private static setupSidebarToggle(
        toggleId: string,
        sidebarId: string,
        overlayId: string,
    ): void {
        const toggle = document.getElementById(toggleId);
        const sidebar = document.getElementById(sidebarId);
        const overlay = document.getElementById(overlayId);

        if (!toggle || !sidebar) return;

        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay?.classList.toggle('show');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }

    private static renderDepartmentFilters(): void {
        const container = document.getElementById('department-filter-list');
        if (!container) return;

        container.innerHTML = `
            <button class="dept-badge active" data-dept="all">All Departments</button>
            ${DEPARTMENTS.map(d => `<button class="dept-badge" data-dept="${d}">${d}</button>`).join('')}
        `;

        container.addEventListener('click', e => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('dept-badge')) {
                const dept = target.getAttribute('data-dept') || 'all';
                container
                    .querySelectorAll('.dept-badge')
                    .forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                store.setDepartment(dept);
            }
        });
    }
}
