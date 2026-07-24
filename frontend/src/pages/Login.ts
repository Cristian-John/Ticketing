import { authAPI } from '../services/api';
import { store } from '../state/store';
import { Router } from '../router/router';
import { showToast } from '../components/Toast';

export class LoginPage {
    private static isRegisterMode = false;

    public static init(): void {
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        const usernameInput = document.getElementById('login-username') as HTMLInputElement;
        const passwordInput = document.getElementById('login-password') as HTMLInputElement;
        const fullNameInput = document.getElementById('login-fullname') as HTMLInputElement;
        const emailInput = document.getElementById('login-email') as HTMLInputElement;
        const confirmPasswordInput = document.getElementById('login-confirm-password') as HTMLInputElement;
        const rememberCheckbox = document.getElementById('login-remember') as HTMLInputElement;

        // Container wrappers
        const fullNameGroup = document.getElementById('fullName-group');
        const emailGroup = document.getElementById('email-group');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const rememberMeGroup = document.getElementById('remember-me-group');

        // Form texts
        const authTitle = document.getElementById('auth-title');
        const loginBtnText = document.getElementById('login-btn-text');
        const authToggleMessage = document.getElementById('auth-toggle-message');
        const toggleAuthMode = document.getElementById('toggle-auth-mode');

        // Password Show/Hide Toggle
        const passwordToggle = document.getElementById('login-password-toggle');
        passwordToggle?.addEventListener('click', () => {
            if (passwordInput) {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                passwordToggle.textContent = type === 'password' ? '👁️' : '🔒';
            }
        });

        // Mode toggler
        toggleAuthMode?.addEventListener('click', (e) => {
            e.preventDefault();
            this.isRegisterMode = !this.isRegisterMode;

            // Hide forgot password message when switching modes
            const forgotMsg = document.getElementById('forgot-password-message');
            if (forgotMsg) forgotMsg.style.display = 'none';
            const forgotContainer = document.getElementById('forgot-password-container');

            if (this.isRegisterMode) {
                // Switch to Register Mode
                if (fullNameGroup) fullNameGroup.style.display = 'block';
                if (emailGroup) emailGroup.style.display = 'block';
                if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'block';
                if (rememberMeGroup) rememberMeGroup.style.display = 'none';
                if (forgotContainer) forgotContainer.style.display = 'none';

                if (authTitle) authTitle.textContent = 'Register';
                if (loginBtnText) loginBtnText.textContent = 'Register';
                if (authToggleMessage) authToggleMessage.textContent = 'Already have an account?';
                if (toggleAuthMode) toggleAuthMode.textContent = 'Sign In';

                // Set inputs as required/optional
                if (fullNameInput) fullNameInput.required = true;
                if (emailInput) emailInput.required = true;
                if (confirmPasswordInput) confirmPasswordInput.required = true;
            } else {
                // Switch to Sign In Mode
                if (fullNameGroup) fullNameGroup.style.display = 'none';
                if (emailGroup) emailGroup.style.display = 'none';
                if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
                if (rememberMeGroup) rememberMeGroup.style.display = 'flex';
                if (forgotContainer) forgotContainer.style.display = 'block';

                if (authTitle) authTitle.textContent = 'Sign In';
                if (loginBtnText) loginBtnText.textContent = 'Sign In';
                if (authToggleMessage) authToggleMessage.textContent = "Don't have an account?";
                if (toggleAuthMode) toggleAuthMode.textContent = 'Register';

                // Remove requirements
                if (fullNameInput) fullNameInput.required = false;
                if (emailInput) emailInput.required = false;
                if (confirmPasswordInput) confirmPasswordInput.required = false;
            }
        });

        // Forgot Password toggle
        const forgotLink = document.getElementById('forgot-password-link');
        forgotLink?.addEventListener('click', (e) => {
            e.preventDefault();
            const forgotMsg = document.getElementById('forgot-password-message');
            if (forgotMsg) {
                forgotMsg.style.display = forgotMsg.style.display === 'none' ? 'block' : 'none';
            }
        });

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (this.isRegisterMode) {
                // Client-side validations for registration
                const fullName = fullNameInput.value.trim();
                const email = emailInput.value.trim();
                const confirmPassword = confirmPasswordInput.value;

                if (!fullName || !email || !username || !password) {
                    showToast('Please fill in all fields', 'error');
                    return;
                }

                if (password !== confirmPassword) {
                    showToast('Passwords do not match', 'error');
                    return;
                }

                // Password strength check
                const hasLetter = /[a-zA-Z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                if (password.length < 8 || !hasLetter || !hasNumber) {
                    showToast('Password must be at least 8 characters long and contain both letters and numbers', 'error');
                    return;
                }

                try {
                    const res = await authAPI.register(fullName, username, email, password);
                    if (res.success) {
                        showToast('Account registered successfully! Please sign in.', 'success');
                        // Reset form fields
                        if (fullNameInput) fullNameInput.value = '';
                        if (emailInput) emailInput.value = '';
                        if (confirmPasswordInput) confirmPasswordInput.value = '';
                        // Toggle back to login mode
                        toggleAuthMode?.click();
                    }
                } catch (err: any) {
                    showToast(err.message || 'Registration failed', 'error');
                }
            } else {
                // Sign In mode
                if (!username || !password) {
                    showToast('Please enter both username and password', 'error');
                    return;
                }

                try {
                    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
                    const res = await authAPI.login(username, password);
                    if (res.success) {
                        store.setSession(res.user, rememberMe);
                        showToast(`Welcome back, ${res.user.fullName}!`, 'success');
                        
                        if (res.user.role === 'admin' || res.user.role === 'it-support') {
                            Router.enterAdmin('dashboard');
                        } else {
                            Router.enterClient('my-tickets');
                        }
                    }
                } catch (err: any) {
                    showToast(err.message || 'Login failed', 'error');
                }
            }
        });
    }
}
