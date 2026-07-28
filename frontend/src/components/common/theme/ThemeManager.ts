export class ThemeManager {
    static readonly STORAGE_KEY = 'ticketing_theme';
    static readonly DEFAULT_THEME = 'dark';

    /**
     * Initialize the theme based on local storage or system preference.
     */
    static initialize(): void {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        let themeToApply = this.DEFAULT_THEME;

        if (savedTheme === 'light' || savedTheme === 'dark') {
            themeToApply = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            themeToApply = 'light';
        }

        this.applyTheme(themeToApply);
    }

    /**
     * Toggles the current theme between 'light' and 'dark'.
     */
    static toggle(): void {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        
        // Dispatch a custom event so ThemeToggle UI can update
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    }

    /**
     * Gets the currently applied theme.
     */
    static getCurrentTheme(): 'light' | 'dark' {
        return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    /**
     * Applies a specific theme and persists it.
     */
    private static applyTheme(theme: string): void {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
    }
}
