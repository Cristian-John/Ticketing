import { store } from '../state/store';
import { Article, Attachment, Note, Stats, Ticket, UserSession } from '../types';

const API_BASE = '/api/v1';

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const user = store.getState().currentUser;
    const token = user ? user.token : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
            ...headers,
            ...opts.headers,
        },
    });
    if (!res.ok) {
        let errorMsg = 'An error occurred';
        try {
            const err = await res.json();
            errorMsg = err.error || err.message || errorMsg;
        } catch {
            // ignore non-JSON responses
        }
        throw new Error(errorMsg);
    }
    return res.json();
}

export const ticketsAPI = {
    getAll: (params: Record<string, string> = {}): Promise<Ticket[]> => {
        const query = new URLSearchParams(params).toString();
        return api<Ticket[]>(`/tickets${query ? '?' + query : ''}`);
    },
    getById: (id: string): Promise<Ticket> => api<Ticket>(`/tickets/${id}`),
    create: (ticket: Partial<Ticket>): Promise<Ticket> =>
        api<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
    update: (id: string, updates: Partial<Ticket> & { changedBy?: string }): Promise<Ticket> =>
        api<Ticket>(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string): Promise<{ success: boolean; id: string }> =>
        api<{ success: boolean; id: string }>(`/tickets/${id}`, { method: 'DELETE' }),
    addNote: (id: string, text: string, author: string): Promise<Note> =>
        api<Note>(`/tickets/${id}/notes`, {
            method: 'POST',
            body: JSON.stringify({ text, author }),
        }),
    uploadAttachment: async (id: string, file: File): Promise<Attachment> => {
        const formData = new FormData();
        formData.append('file', file);
        const user = store.getState().currentUser;
        const token = user ? user.token : null;

        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE}/tickets/${id}/attachments`, {
            method: 'POST',
            body: formData,
            headers,
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
    },
};

export const articlesAPI = {
    getAll: (search?: string): Promise<Article[]> => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return api<Article[]>(`/articles${query}`);
    },
    getById: (id: string): Promise<Article> => api<Article>(`/articles/${id}`),
    create: (article: Partial<Article>): Promise<Article> =>
        api<Article>('/articles', { method: 'POST', body: JSON.stringify(article) }),
    update: (id: string, updates: Partial<Article>): Promise<Article> =>
        api<Article>(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string): Promise<{ success: boolean; id: string }> =>
        api<{ success: boolean; id: string }>(`/articles/${id}`, { method: 'DELETE' }),
    reorder: (order: string[]): Promise<{ success: boolean }> =>
        api<{ success: boolean }>('/articles/reorder', {
            method: 'PUT',
            body: JSON.stringify({ order }),
        }),
};

export const statsAPI = {
    get: (): Promise<Stats> => api<Stats>('/stats'),
};

export const usersAPI = {
    getAll: (search?: string): Promise<any[]> => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return api<any[]>(`/users${query}`);
    },
    getByRole: (role: string): Promise<any[]> =>
        api<any[]>(`/users?role=${encodeURIComponent(role)}`),
    create: (userData: any): Promise<any> =>
        api<any>('/users', { method: 'POST', body: JSON.stringify(userData) }),
    update: (id: string, updates: any): Promise<any> =>
        api<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deactivate: (id: string): Promise<{ success: boolean }> =>
        api<{ success: boolean }>(`/users/${id}/deactivate`, { method: 'PUT' }),
    resetPassword: (id: string, passwordPlain: string): Promise<{ success: boolean }> =>
        api<{ success: boolean }>(`/users/${id}/reset-password`, {
            method: 'PUT',
            body: JSON.stringify({ password: passwordPlain }),
        }),
    changePassword: (
        currentPassword: string,
        newPassword: string,
        confirmPassword: string,
    ): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>('/users/me/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
        }),
};

export const authAPI = {
    login: (
        username: string,
        password?: string,
    ): Promise<{ success: boolean; user: UserSession }> =>
        api<{ success: boolean; user: UserSession }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),
    register: (
        fullName: string,
        username: string,
        email: string,
        password?: string,
    ): Promise<{ success: boolean; user: UserSession }> =>
        api<{ success: boolean; user: UserSession }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ fullName, username, email, password }),
        }),
    validate: (token: string): Promise<{ success: boolean; user: UserSession }> =>
        api<{ success: boolean; user: UserSession }>('/auth/validate', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),
    logout: (token: string): Promise<{ success: boolean }> =>
        api<{ success: boolean }>('/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),
};
