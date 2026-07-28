import { HexagonBackground } from '../components/background/HexagonBackground';
import { ShieldIcon } from '../components/common/Icons';
import { ThemeToggle } from '../components/common/theme/ThemeToggle';

export class LoginLayout {
    private element: HTMLDivElement;
    private contentContainer: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.id = 'login-screen';
        this.element.className = 'screen';

        const themeToggle = new ThemeToggle(true);
        this.element.appendChild(themeToggle.getElement());

        HexagonBackground.init();

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

        const form = document.createElement('form');
        form.id = 'login-form';
        form.className = 'login-form';
        form.innerHTML = `
            <!-- Full Name (Register Only) -->
            <div class="form-group" id="fullName-group" style="display:none">
                <label for="login-fullname">Full Name</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input type="text" id="login-fullname" placeholder="Enter your full name">
                </div>
            </div>

            <!-- Username (Both) -->
            <div class="form-group">
                <label for="login-username">Username</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input type="text" id="login-username" placeholder="Enter username" required>
                </div>
            </div>

            <!-- Email (Register Only) -->
            <div class="form-group" id="email-group" style="display:none">
                <label for="login-email">Email</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                    </svg>
                    <input type="email" id="login-email" placeholder="Enter your email">
                </div>
            </div>

            <!-- Password (Both) -->
            <div class="form-group" id="password-group">
                <label for="login-password">Password</label>
                <div class="input-wrapper" style="position:relative">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input type="password" id="login-password" placeholder="Enter password" required>
                    <button type="button" class="password-toggle-btn" id="login-password-toggle">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </div>

            <!-- Confirm Password (Register Only) -->
            <div class="form-group" id="confirm-password-group" style="display:none">
                <label for="login-confirm-password">Confirm Password</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input type="password" id="login-confirm-password" placeholder="Confirm password">
                </div>
            </div>

            <!-- Remember Me (Sign In Only) -->
            <div class="checkbox-group" id="remember-me-group">
                <input type="checkbox" id="login-remember" class="custom-checkbox">
                <label for="login-remember">Remember me</label>
            </div>

            <button type="submit" class="btn btn-primary btn-login" id="login-btn">
                <span id="login-btn-text">Sign In</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                </svg>
            </button>
            
            <div class="auth-toggle-container" style="text-align:center; margin-top:20px; font-size:14px; color:rgba(255,255,255,0.6)">
                <span id="auth-toggle-message">Don't have an account?</span>
                <a href="#" id="toggle-auth-mode" style="color:var(--accent); text-decoration:none; font-weight:600; margin-left:4px;">Register</a>
            </div>

            <div id="forgot-password-container" style="text-align:center; margin-top:12px;">
                <a href="#" id="forgot-password-link" style="color:var(--text-muted); text-decoration:none; font-size:13px;">Forgot Password?</a>
                <div id="forgot-password-message" style="display:none; margin-top:8px; padding:10px; background:rgba(0,229,255,0.06); border:1px solid rgba(0,229,255,0.15); border-radius:6px; font-size:12px; color:var(--text-secondary);">
                    🔒 This is an internal system. Please contact your <strong>System Administrator</strong> to reset your password.
                </div>
            </div>
        `;

        card.appendChild(form);
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
