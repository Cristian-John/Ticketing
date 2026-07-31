import { ThemeManager, ColorMode, DesignLanguage } from './ThemeManager';
import { PaletteIcon } from '../Icons';

export class ThemeToggle {
    private element: HTMLDivElement;
    private button: HTMLButtonElement;
    private dropdown: HTMLDivElement;
    private isOpen: boolean = false;
    private instanceId: string;

    constructor(globalMode: boolean = false) {
        this.instanceId = Math.random().toString(36).substring(2, 9);
        this.element = document.createElement('div');
        this.element.className = 'appearance-picker-container';
        this.element.style.position = 'relative';

        this.button = document.createElement('button');
        this.button.className = 'theme-toggle' + (globalMode ? ' global-theme-toggle' : '');
        this.button.innerHTML = `<span class="theme-icon">${PaletteIcon({ size: 20 })}</span>` + (globalMode ? ` <span>Appearance</span>` : '');
        
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'appearance-dropdown';
        // Add basic inline styles for the dropdown, in a real app these would go to CSS
        Object.assign(this.dropdown.style, {
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '8px',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            padding: '16px',
            width: '240px',
            boxShadow: 'var(--shadow-lg)',
            display: 'none',
            flexDirection: 'column',
            gap: '16px',
            zIndex: '100',
            color: 'var(--color-text-primary)'
        });

        this.renderDropdownContent();

        this.element.appendChild(this.button);
        this.element.appendChild(this.dropdown);

        this.bindEvents();
    }

    private renderDropdownContent() {
        const currentColorMode = ThemeManager.getColorMode();
        const currentDesignLanguage = ThemeManager.getDesignLanguage();
        
        // Use a unique name for this instance to prevent radio groups from clashing across multiple topbars
        const colorName = `colorMode_${this.instanceId}`;
        const designName = `designLanguage_${this.instanceId}`;

        this.dropdown.innerHTML = `
            <div>
                <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">Color Mode</div>
                <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; cursor: pointer;">
                    <input type="radio" class="custom-radio" name="${colorName}" value="light" ${currentColorMode === 'light' ? 'checked' : ''}> Light
                </label>
                <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; cursor: pointer;">
                    <input type="radio" class="custom-radio" name="${colorName}" value="dark" ${currentColorMode === 'dark' ? 'checked' : ''}> Dark
                </label>
                <label style="display: flex; gap: 8px; align-items: center; cursor: pointer;">
                    <input type="radio" class="custom-radio" name="${colorName}" value="system" ${currentColorMode === 'system' ? 'checked' : ''}> System
                </label>
            </div>
            <div style="height: 1px; background: var(--color-border); width: 100%;"></div>
            <div>
                <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">Design Language</div>
                <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; cursor: pointer;">
                    <input type="radio" class="custom-radio" name="${designName}" value="standard" ${currentDesignLanguage === 'standard' ? 'checked' : ''}> Standard (Clean)
                </label>
                <label style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; cursor: pointer;">
                    <input type="radio" class="custom-radio" name="${designName}" value="hexagon-blue" ${currentDesignLanguage === 'hexagon-blue' ? 'checked' : ''}> Hexagon Blue
                </label>
                <label style="display: flex; gap: 8px; align-items: center; cursor: pointer;">
                    <input type="radio" class="custom-radio" name="${designName}" value="quantum" ${currentDesignLanguage === 'quantum' ? 'checked' : ''}> Quantum Flux
                </label>
            </div>
        `;

        this.dropdown.querySelectorAll(`input[name="${colorName}"]`).forEach(input => {
            input.addEventListener('change', (e) => {
                ThemeManager.setColorMode((e.target as HTMLInputElement).value as ColorMode);
            });
        });

        this.dropdown.querySelectorAll(`input[name="${designName}"]`).forEach(input => {
            input.addEventListener('change', (e) => {
                ThemeManager.setDesignLanguage((e.target as HTMLInputElement).value as DesignLanguage);
            });
        });
    }

    private bindEvents(): void {
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('close-dropdowns', { detail: { except: 'theme' } }));
            this.isOpen = !this.isOpen;
            this.dropdown.style.display = this.isOpen ? 'flex' : 'none';
        });

        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.element.contains(e.target as Node)) {
                this.isOpen = false;
                this.dropdown.style.display = 'none';
            }
        });
        
        document.addEventListener('close-dropdowns', ((e: CustomEvent) => {
            if (e.detail?.except !== 'theme') {
                this.isOpen = false;
                this.dropdown.style.display = 'none';
            }
        }) as EventListener);

        window.addEventListener('appearanceChanged', (() => {
            this.renderDropdownContent();
        }) as EventListener);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
