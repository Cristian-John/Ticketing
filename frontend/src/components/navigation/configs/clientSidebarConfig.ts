import { SidebarConfig } from './SidebarConfig';
import { DocumentIcon, BookIcon, UserIcon } from '../../common/Icons';

export const clientSidebarConfig: SidebarConfig = {
    portalName: 'Client Portal',
    items: [
        {
            view: 'my-tickets',
            label: 'My Tickets',
            icon: DocumentIcon({ size: 16 })
        },
        {
            view: 'knowledge-base',
            label: 'Knowledge Base',
            icon: BookIcon({ size: 16 })
        },
        {
            view: 'profile',
            label: 'Profile',
            icon: UserIcon({ size: 16 })
        }
    ]
};
