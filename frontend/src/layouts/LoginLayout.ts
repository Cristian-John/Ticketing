import { ThemeToggle } from '../components/common/theme/ThemeToggle';
import { ShieldIcon } from '../components/common/Icons';

export class LoginLayout {
    private element: HTMLDivElement;
    private contentContainer: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.id = 'login-screen';
        this.element.className = 'screen';

        const themeToggle = new ThemeToggle(true);
        this.element.appendChild(themeToggle.getElement());

        const container = document.createElement('div');
        container.className = 'login-container';

        const card = document.createElement('div');
        card.className = 'login-card glass-card';

        const logo = document.createElement('div');
        logo.className = 'login-logo';
        logo.innerHTML = `
            <div class="logo-icon">
                ${ShieldIcon({ size: 40 })}
            </div>
            <h1 id="auth-title">Sign In</h1>
            <p class="login-subtitle">IT Support Ticketing System</p>
        `;

        card.appendChild(logo);
        container.appendChild(card);
        this.element.appendChild(container);

        this.contentContainer = card;
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public appendContent(content: HTMLElement): void {
        this.contentContainer.appendChild(content);
    }
}
