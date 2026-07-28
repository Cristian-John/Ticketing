import { SidebarConfig } from './SidebarConfig';
import { DashboardIcon, ListIcon, StarIcon, BookIcon, UsersIcon, UserIcon } from '../../common/Icons';

export const adminSidebarConfig: SidebarConfig = {
    portalName: 'Admin Portal',
    items: [
        {
            view: 'dashboard',
            label: 'Dashboard',
            icon: DashboardIcon({ size: 16 })
        },
        {
            view: 'all-tickets',
            label: 'All Tickets',
            icon: ListIcon({ size: 16 })
        },
        {
            view: 'resolved',
            label: 'Resolved & Ratings',
            icon: StarIcon({ size: 16 })
        },
        {
            view: 'knowledge-base',
            label: 'Knowledge Base',
            icon: BookIcon({ size: 16 })
        },
        {
            id: 'admin-nav-users',
            view: 'users',
            label: 'Users',
            icon: UsersIcon({ size: 16 }),
            requireAdmin: true
        },
        {
            view: 'profile',
            label: 'Profile',
            icon: UserIcon({ size: 16 })
        }
    ]
};
