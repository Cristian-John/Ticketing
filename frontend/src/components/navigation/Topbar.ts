import { ThemeToggle } from '../common/theme/ThemeToggle';
import { MenuIcon } from '../common/Icons';

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
     * Appends a custom action element (like a search bar or filter) before the theme toggle.
     */
    public appendAction(element: HTMLElement): void {
        // Insert before theme toggle so theme toggle stays on far right
        this.actionsContainer.insertBefore(element, this.themeToggle.getElement());
    }

    /**
     * Removes all custom action elements.
     */
    public clearActions(): void {
        while (this.actionsContainer.firstChild !== this.themeToggle.getElement()) {
            this.actionsContainer.removeChild(this.actionsContainer.firstChild!);
        }
    }

    /**
     * Returns the root element of the topbar.
     */
    public getElement(): HTMLElement {
        return this.element;
    }
}
