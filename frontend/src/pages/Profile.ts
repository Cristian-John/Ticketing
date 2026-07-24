import { store } from '../state/store';
import { usersAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { getPortalContentContainer } from '../utils/portalContent';

export class ProfilePage {
    public static load(): void {
        const user = store.getState().currentUser;
        if (!user) return;

        const container = getPortalContentContainer();
        if (!container) return;

        const roleLabel = user.role === 'it-support' ? 'IT Support' : user.role.charAt(0).toUpperCase() + user.role.slice(1);

        container.innerHTML = `
            <div class="profile-page">
                <div class="profile-section glass-card">
                    <div class="profile-header">
                        <div class="profile-avatar">${(user.fullName || user.username).charAt(0).toUpperCase()}</div>
                        <div>
                            <h2 class="profile-name">${user.fullName || user.username}</h2>
                            <span class="profile-role-badge">${roleLabel}</span>
                        </div>
                    </div>

                    <div class="profile-info-grid">
                        <div class="profile-info-item">
                            <label>Full Name</label>
                            <div class="profile-info-value">${user.fullName || '—'}</div>
                        </div>
                        <div class="profile-info-item">
                            <label>Username</label>
                            <div class="profile-info-value">${user.username}</div>
                        </div>
                        <div class="profile-info-item">
                            <label>Email</label>
                            <div class="profile-info-value">${user.email || '—'}</div>
                        </div>
                        <div class="profile-info-item">
                            <label>Role</label>
                            <div class="profile-info-value">${roleLabel}</div>
                        </div>
                        <div class="profile-info-item">
                            <label>Account Status</label>
                            <div class="profile-info-value">
                                <span class="status-dot active"></span> Active
                            </div>
                        </div>
                    </div>
                </div>

                <div class="profile-section glass-card">
                    <h3 class="profile-section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Change Password
                    </h3>
                    <form id="change-password-form" class="change-password-form">
                        <div class="form-group">
                            <label for="profile-current-password">Current Password <span class="required">*</span></label>
                            <div class="input-wrapper" style="position:relative">
                                <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <input type="password" id="profile-current-password" placeholder="Enter current password" required>
                                <button type="button" class="password-toggle" id="profile-current-toggle" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; padding:5px;">👁️</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="profile-new-password">New Password <span class="required">*</span></label>
                            <div class="input-wrapper" style="position:relative">
                                <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <input type="password" id="profile-new-password" placeholder="Enter new password" required>
                                <button type="button" class="password-toggle" id="profile-new-toggle" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; padding:5px;">👁️</button>
                            </div>
                            <small class="password-hint">Min 8 characters, at least one letter and one number</small>
                        </div>

                        <div class="form-group">
                            <label for="profile-confirm-password">Confirm New Password <span class="required">*</span></label>
                            <div class="input-wrapper" style="position:relative">
                                <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <input type="password" id="profile-confirm-password" placeholder="Confirm new password" required>
                                <button type="button" class="password-toggle" id="profile-confirm-toggle" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; padding:5px;">👁️</button>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary" id="change-password-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            <span>Update Password</span>
                        </button>
                    </form>
                </div>
            </div>
        `;

        this.initPasswordToggles();
        this.initForm();
    }

    private static initPasswordToggles(): void {
        const toggles = [
            { toggleId: 'profile-current-toggle', inputId: 'profile-current-password' },
            { toggleId: 'profile-new-toggle', inputId: 'profile-new-password' },
            { toggleId: 'profile-confirm-toggle', inputId: 'profile-confirm-password' },
        ];

        for (const { toggleId, inputId } of toggles) {
            const btn = document.getElementById(toggleId);
            const input = document.getElementById(inputId) as HTMLInputElement;
            if (!btn || !input) continue;

            btn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.textContent = isPassword ? '🔒' : '👁️';
            });
        }
    }

    private static initForm(): void {
        const form = document.getElementById('change-password-form') as HTMLFormElement;
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPassword = (document.getElementById('profile-current-password') as HTMLInputElement).value;
            const newPassword = (document.getElementById('profile-new-password') as HTMLInputElement).value;
            const confirmPassword = (document.getElementById('profile-confirm-password') as HTMLInputElement).value;
            const submitBtn = document.getElementById('change-password-btn') as HTMLButtonElement;

            // Client-side validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast('All password fields are required.', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('New password and confirmation do not match.', 'error');
                return;
            }

            if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                showToast('Password must be at least 8 characters with at least one letter and one number.', 'error');
                return;
            }

            if (currentPassword === newPassword) {
                showToast('New password must be different from your current password.', 'error');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Updating...';
                }

                await usersAPI.changePassword(currentPassword, newPassword, confirmPassword);

                showToast('Password changed successfully! All other sessions have been invalidated.', 'success');
                form.reset();
            } catch (err: any) {
                showToast(err.message || 'Failed to change password.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17 21 17 13 7 13 7 21"/>
                            <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        <span>Update Password</span>
                    `;
                }
            }
        });
    }
}
