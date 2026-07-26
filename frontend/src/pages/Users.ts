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
            <div class="table-container">
                <table class="glass-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th style="text-align:right">Actions</th>
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
                        <td colspan="6" style="padding: var(--space-2xl);">
                            <div class="empty-state" style="border: none; background: transparent; padding: 0;">
                                <div class="empty-state-icon">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                                </div>
                                <div class="empty-state-title">No users found</div>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = users.map(u => `
                <tr>
                    <td style="font-weight:600">${escapeHTML(u.fullName)}</td>
                    <td>${escapeHTML(u.username)}</td>
                    <td style="color:var(--text-muted)">${escapeHTML(u.email)}</td>
                    <td>
                        <span class="badge" style="background:rgba(255,255,255,0.05); color:#fff; font-size:11px; padding:3px 8px; border-radius:12px; border:1px solid rgba(255,255,255,0.1)">
                            ${u.role === 'admin' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg> Admin' : u.role === 'it-support' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> IT Support' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Client'}
                        </span>
                    </td>
                    <td>
                        <span class="badge" style="background:${Number(u.active) === 1 ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)'}; color:${Number(u.active) === 1 ? '#2ed573' : '#ff4757'}; font-size:11px; padding:3px 8px; border-radius:12px; border:1px solid ${Number(u.active) === 1 ? 'rgba(46,213,115,0.2)' : 'rgba(255,71,87,0.2)'}">
                            ${Number(u.active) === 1 ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td style="text-align:right">
                        <div style="display:inline-flex; gap:6px">
                            <button class="btn btn-secondary btn-sm edit-user-action" data-id="${u.id}">Edit</button>
                            <button class="btn btn-secondary btn-sm reset-user-action" data-id="${u.id}">Reset</button>
                            ${Number(u.active) === 1 ? `
                                <button class="btn btn-ghost btn-sm deactivate-user-action" data-id="${u.id}" style="color:var(--severity-severe)">Deactivate</button>
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
                passwordToggle.innerHTML = type === 'password' ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
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
            title.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit User';
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
            title.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Create User';
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
