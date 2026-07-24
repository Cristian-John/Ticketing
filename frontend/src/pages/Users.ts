import { usersAPI } from '../services/api';
import { clearPortalContent } from '../utils/portalContent';
import { escapeHTML } from '../utils/formatters';
import { showToast } from '../components/Toast';
import { ModalsComponent } from '../components/Modals';

export class UsersPage {
    private static listenersBound = false;

    public static async load(): Promise<void> {
        const container = clearPortalContent();
        if (!container) return;

        container.innerHTML = `
            <div class="view-header">
                <h2>User Management</h2>
                <button class="btn btn-primary" id="create-user-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Create User
                </button>
            </div>

            <div class="toolbar glass-card" style="margin-bottom:20px; padding:15px; display:flex; gap:15px; align-items:center">
                <div class="search-box" style="flex:1">
                    <input type="text" id="users-search-input" placeholder="Search users by name, username, email..." style="width:100%; padding:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff">
                </div>
            </div>

            <div class="table-container glass-card" style="padding:15px">
                <table class="tickets-table" style="width:100%; border-collapse:collapse">
                    <thead>
                        <tr style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px">
                            <th style="padding:10px">Full Name</th>
                            <th style="padding:10px">Username</th>
                            <th style="padding:10px">Email</th>
                            <th style="padding:10px">Role</th>
                            <th style="padding:10px">Status</th>
                            <th style="padding:10px; text-align:right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
                        <tr><td colspan="6" style="padding:20px; text-align:center; color:rgba(255,255,255,0.5)">Loading users...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        this.initListeners();
        await this.refreshUsersList();
    }

    private static async refreshUsersList(search?: string): Promise<void> {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        try {
            const users = await usersAPI.getAll(search);
            if (users.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="padding:30px; text-align:center; color:rgba(255,255,255,0.5)">
                            No users found.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = users.map(u => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                    <td style="padding:12px 10px; font-weight:600">${escapeHTML(u.fullName)}</td>
                    <td style="padding:12px 10px">${escapeHTML(u.username)}</td>
                    <td style="padding:12px 10px; color:rgba(255,255,255,0.6)">${escapeHTML(u.email)}</td>
                    <td style="padding:12px 10px">
                        <span class="badge" style="background:rgba(255,255,255,0.05); color:#fff; font-size:11px; padding:3px 8px; border-radius:12px; border:1px solid rgba(255,255,255,0.1)">
                            ${u.role === 'admin' ? '🔑 Admin' : u.role === 'it-support' ? '🛠️ IT Support' : '👤 Client'}
                        </span>
                    </td>
                    <td style="padding:12px 10px">
                        <span class="badge" style="background:${Number(u.active) === 1 ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)'}; color:${Number(u.active) === 1 ? '#2ed573' : '#ff4757'}; font-size:11px; padding:3px 8px; border-radius:12px; border:1px solid ${Number(u.active) === 1 ? 'rgba(46,213,115,0.2)' : 'rgba(255,71,87,0.2)'}">
                            ${Number(u.active) === 1 ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td style="padding:12px 10px; text-align:right">
                        <div style="display:inline-flex; gap:6px">
                            <button class="btn btn-secondary btn-sm edit-user-action" data-id="${u.id}" style="padding:4px 8px; font-size:11px">Edit</button>
                            <button class="btn btn-secondary btn-sm reset-user-action" data-id="${u.id}" style="padding:4px 8px; font-size:11px">Reset Password</button>
                            ${Number(u.active) === 1 ? `
                                <button class="btn btn-ghost btn-sm deactivate-user-action" data-id="${u.id}" style="padding:4px 8px; font-size:11px; color:#ff4757">Deactivate</button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');

            // Bind action clicks
            tbody.querySelectorAll('.edit-user-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if (id) {
                        const user = users.find(x => x.id === id);
                        if (user) this.openUserModal(user);
                    }
                });
            });

            tbody.querySelectorAll('.reset-user-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if (id) this.openResetPasswordModal(id);
                });
            });

            tbody.querySelectorAll('.deactivate-user-action').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (id && confirm('Are you sure you want to deactivate this user? They will no longer be able to log in.')) {
                        try {
                            await usersAPI.deactivate(id);
                            showToast('User deactivated', 'success');
                            this.refreshUsersList();
                        } catch (err: any) {
                            showToast(err.message || 'Deactivation failed', 'error');
                        }
                    }
                });
            });

        } catch (err: any) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center; color:#ff4757">Failed to load users: ${escapeHTML(err.message)}</td></tr>`;
        }
    }

    private static initListeners(): void {
        if (this.listenersBound) return;
        this.listenersBound = true;

        // Search listener
        const searchInput = document.getElementById('users-search-input');
        let searchTimeout: any = null;
        searchInput?.addEventListener('input', (e) => {
            const val = (e.target as HTMLInputElement).value;
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.refreshUsersList(val);
            }, 300);
        });

        // Create user button
        const createBtn = document.getElementById('create-user-btn');
        createBtn?.addEventListener('click', () => {
            this.openUserModal();
        });

        // User password toggle
        const passwordToggle = document.getElementById('user-password-toggle');
        const passwordInput = document.getElementById('user-password') as HTMLInputElement;
        passwordToggle?.addEventListener('click', () => {
            if (passwordInput) {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                passwordToggle.textContent = type === 'password' ? '👁️' : '🔒';
            }
        });

        // User form submit
        const form = document.getElementById('user-form') as HTMLFormElement;
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idField = document.getElementById('user-id-field') as HTMLInputElement;
            const fullnameInput = document.getElementById('user-fullname') as HTMLInputElement;
            const usernameInput = document.getElementById('user-username') as HTMLInputElement;
            const emailInput = document.getElementById('user-email') as HTMLInputElement;
            const passwordInput = document.getElementById('user-password') as HTMLInputElement;
            const roleSelect = document.getElementById('user-role') as HTMLSelectElement;
            const activeCheckbox = document.getElementById('user-active') as HTMLInputElement;

            const isEdit = !!idField.value;

            try {
                if (isEdit) {
                    await usersAPI.update(idField.value, {
                        fullName: fullnameInput.value.trim(),
                        email: emailInput.value.trim(),
                        role: roleSelect.value,
                        active: activeCheckbox.checked
                    });
                    showToast('User updated successfully', 'success');
                } else {
                    const password = passwordInput.value;
                    const hasLetter = /[a-zA-Z]/.test(password);
                    const hasNumber = /[0-9]/.test(password);
                    if (password.length < 8 || !hasLetter || !hasNumber) {
                        showToast('Password must be at least 8 characters long and contain both letters and numbers', 'error');
                        return;
                    }

                    await usersAPI.create({
                        fullName: fullnameInput.value.trim(),
                        username: usernameInput.value.trim(),
                        email: emailInput.value.trim(),
                        password,
                        role: roleSelect.value
                    });
                    showToast('User created successfully', 'success');
                }

                ModalsComponent.closeModal('user-modal');
                this.refreshUsersList();
            } catch (err: any) {
                showToast(err.message || 'Action failed', 'error');
            }
        });

        // Reset password form submit
        const resetForm = document.getElementById('reset-password-form') as HTMLFormElement;
        resetForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idField = document.getElementById('reset-user-id-field') as HTMLInputElement;
            const passwordInput = document.getElementById('reset-password-val') as HTMLInputElement;
            const confirmInput = document.getElementById('reset-password-confirm') as HTMLInputElement;

            const password = passwordInput.value;
            if (password !== confirmInput.value) {
                showToast('Passwords do not match', 'error');
                return;
            }

            const hasLetter = /[a-zA-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (password.length < 8 || !hasLetter || !hasNumber) {
                showToast('Password must be at least 8 characters long and contain both letters and numbers', 'error');
                return;
            }

            try {
                await usersAPI.resetPassword(idField.value, password);
                showToast('Password reset successfully', 'success');
                ModalsComponent.closeModal('reset-password-modal');
            } catch (err: any) {
                showToast(err.message || 'Reset failed', 'error');
            }
        });

        // Cancel button listeners
        document.getElementById('cancel-user-modal-btn')?.addEventListener('click', () => {
            ModalsComponent.closeModal('user-modal');
        });
        document.getElementById('cancel-reset-modal-btn')?.addEventListener('click', () => {
            ModalsComponent.closeModal('reset-password-modal');
        });
    }

    private static openUserModal(user?: any): void {
        const title = document.getElementById('user-modal-title');
        const idField = document.getElementById('user-id-field') as HTMLInputElement;
        const fullnameInput = document.getElementById('user-fullname') as HTMLInputElement;
        const usernameInput = document.getElementById('user-username') as HTMLInputElement;
        const emailInput = document.getElementById('user-email') as HTMLInputElement;
        const passwordInput = document.getElementById('user-password') as HTMLInputElement;
        const passwordGroup = document.getElementById('user-password-group');
        const roleSelect = document.getElementById('user-role') as HTMLSelectElement;
        const activeCheckbox = document.getElementById('user-active') as HTMLInputElement;
        const activeGroup = document.getElementById('user-active-group');

        if (!title || !idField || !fullnameInput || !usernameInput || !emailInput || !passwordInput || !roleSelect || !activeCheckbox) return;

        if (user) {
            // Edit mode
            title.textContent = '✏️ Edit User';
            idField.value = user.id;
            fullnameInput.value = user.fullName;
            usernameInput.value = user.username;
            usernameInput.disabled = true; // Username is immutable
            emailInput.value = user.email;
            
            if (passwordGroup) passwordGroup.style.display = 'none';
            passwordInput.required = false;
            passwordInput.value = '';

            roleSelect.value = user.role;
            activeCheckbox.checked = Number(user.active) === 1;
            if (activeGroup) activeGroup.style.display = 'flex';
        } else {
            // Create mode
            title.textContent = '👤 Create User';
            idField.value = '';
            fullnameInput.value = '';
            usernameInput.value = '';
            usernameInput.disabled = false;
            emailInput.value = '';
            
            if (passwordGroup) passwordGroup.style.display = 'block';
            passwordInput.required = true;
            passwordInput.value = '';

            roleSelect.value = 'it-support';
            activeCheckbox.checked = true;
            if (activeGroup) activeGroup.style.display = 'none';
        }

        ModalsComponent.openModal('user-modal');
    }

    private static openResetPasswordModal(userId: string): void {
        const idField = document.getElementById('reset-user-id-field') as HTMLInputElement;
        const passwordInput = document.getElementById('reset-password-val') as HTMLInputElement;
        const confirmInput = document.getElementById('reset-password-confirm') as HTMLInputElement;

        if (idField) idField.value = userId;
        if (passwordInput) passwordInput.value = '';
        if (confirmInput) confirmInput.value = '';

        ModalsComponent.openModal('reset-password-modal');
    }
}
