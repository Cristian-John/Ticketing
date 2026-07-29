import { MenuIcon } from '../common/Icons';
import { ThemeToggle } from '../common/theme/ThemeToggle';
import { NotificationsDropdown } from '../NotificationsDropdown';

export interface TopbarConfig {
    titleId: string;
    toggleId: string;
    onToggleSidebar: () => void;
    title?: string;
}

export class Topbar {
    private element: HTMLElement;
    private titleElement: HTMLHeadingElement;
    private actionsContainer: HTMLDivElement;
    private themeToggle: ThemeToggle;
    private notifWrapper: HTMLDivElement;
    public notificationsDropdown: NotificationsDropdown;

    constructor(config: TopbarConfig) {
        this.element = document.createElement('header');
        this.element.className = 'topbar';

        // Left section (Toggle & Title)
        const leftDiv = document.createElement('div');
        leftDiv.style.display = 'flex';
        leftDiv.style.alignItems = 'center';
        leftDiv.style.gap = '10px';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'sidebar-toggle';
        toggleBtn.id = config.toggleId;
        toggleBtn.innerHTML = MenuIcon({ size: 24 });
        toggleBtn.addEventListener('click', () => config.onToggleSidebar());

        this.titleElement = document.createElement('h1');
        this.titleElement.className = 'page-title';
        this.titleElement.id = config.titleId;
        if (config.title) {
            this.titleElement.textContent = config.title;
        }

        leftDiv.appendChild(toggleBtn);
        leftDiv.appendChild(this.titleElement);

        // Right section (Actions)
        this.actionsContainer = document.createElement('div');
        this.actionsContainer.className = 'topbar-actions';
        
        // Notifications Bell
        this.notifWrapper = document.createElement('div');
        this.notifWrapper.className = 'notifications-wrapper';
        
        const bellBtn = document.createElement('button');
        bellBtn.className = 'notifications-btn';
        bellBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="notifications-badge"></span>
        `;
        
        const dropdownContainer = document.createElement('div');
        this.notifWrapper.appendChild(bellBtn);
        this.notifWrapper.appendChild(dropdownContainer);
        
        this.notificationsDropdown = new NotificationsDropdown(dropdownContainer);
        this.notificationsDropdown.setOnUnreadCountChanged((count) => {
            const badge = bellBtn.querySelector('.notifications-badge');
            if (count > 0) {
                badge?.classList.add('visible');
            } else {
                badge?.classList.remove('visible');
            }
        });

        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.notificationsDropdown.toggle();
        });

        this.actionsContainer.appendChild(this.notifWrapper);

        // Add theme toggle (always present on the far right)
        this.themeToggle = new ThemeToggle();
        this.actionsContainer.appendChild(this.themeToggle.getElement());

        this.element.appendChild(leftDiv);
        this.element.appendChild(this.actionsContainer);
    }

    /**
     * Updates the page title.
     */
    public setTitle(title: string): void {
        this.titleElement.textContent = title;
    }

    /**
     * Replaces any existing custom actions with the provided element, or clears them if null.
     */
    public setActions(element: HTMLElement | null): void {
        if (element && this.actionsContainer.firstChild === element) {
            return; // Identical action container is already mounted
        }
        this.clearActions();
        if (element) {
            this.actionsContainer.insertBefore(element, this.notifWrapper);
        }
    }

    /**
     * Appends a custom action element (like a search bar or filter) before the theme toggle.
     */
    public appendAction(element: HTMLElement): void {
        // Insert before notifWrapper so fixed elements stay on the far right
        this.actionsContainer.insertBefore(element, this.notifWrapper);
    }

    /**
     * Removes all custom action elements.
     */
    public clearActions(): void {
        while (this.actionsContainer.firstChild && this.actionsContainer.firstChild !== this.notifWrapper) {
            this.actionsContainer.removeChild(this.actionsContainer.firstChild);
        }
    }

    /**
     * Returns the root element of the topbar.
     */
    public getElement(): HTMLElement {
        return this.element;
    }
}
