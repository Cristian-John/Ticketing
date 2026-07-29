import { MoonIcon, SunIcon } from '../Icons';
import { ThemeManager } from './ThemeManager';

export class ThemeToggle {
    private element: HTMLButtonElement;
    private iconContainer: HTMLSpanElement;
    private textContainer: HTMLSpanElement;
    constructor(globalMode: boolean = false) {
        this.element = document.createElement('button');
        this.element.className = 'theme-toggle' + (globalMode ? ' global-theme-toggle' : '');
        
        this.iconContainer = document.createElement('span');
        this.iconContainer.className = 'theme-icon';
        
        this.textContainer = document.createElement('span');
        
        this.element.appendChild(this.iconContainer);
        this.element.appendChild(this.textContainer);

        this.updateUI(ThemeManager.getCurrentTheme());
        this.bindEvents();
    }

    private bindEvents(): void {
        this.element.addEventListener('click', () => {
            ThemeManager.toggle();
        });

        // Listen for changes from other ThemeToggles
        window.addEventListener('themeChanged', ((e: CustomEvent) => {
            this.updateUI(e.detail.theme);
        }) as EventListener);
    }

    private updateUI(theme: 'light' | 'dark'): void {
        if (theme === 'light') {
            this.iconContainer.innerHTML = SunIcon({ size: 18 });
            this.textContainer.textContent = 'Light Mode';
        } else {
            this.iconContainer.innerHTML = MoonIcon({ size: 18 });
            this.textContainer.textContent = 'Dark Mode';
        }
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
