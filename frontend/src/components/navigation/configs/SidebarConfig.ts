export interface SidebarNavItem {
    id?: string;
    view: string;
    label: string;
    icon: string; // HTML string from Icons module
    requireAdmin?: boolean; // If true, only visible to full admins, not agents
}

export interface SidebarConfig {
    portalName: string;
    items: SidebarNavItem[];
}
