import { store } from '../state/store';
import { Article, Attachment, Note, Stats, Ticket, User, UserSession } from '../types';

const API_BASE = '/api/v1';

export class APIError extends Error {
    public status: number;
    public data: any;

    constructor(message: string, status: number = 500, data: any = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const user = store.getState().currentUser;
    const token = user ? user.token : null;

    const headers = new Headers(opts.headers || {});

    if (!(opts.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let res: Response;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            ...opts,
            headers,
        });
    } catch (networkErr: any) {
        throw new APIError(`Network error: ${networkErr.message}`, 0);
    }

    if (!res.ok) {
        let errorMsg = `HTTP Error ${res.status}`;
        let errorData = null;
        try {
            const err = await res.json();
            errorData = err;
            errorMsg = err.error || err.message || errorMsg;
        } catch {
            // Fallback for non-JSON errors
        }
        throw new APIError(errorMsg, res.status, errorData);
    }

    if (res.status === 204) {
        return {} as T;
    }

    try {
        return await res.json();
    } catch {
        return {} as T;
    }
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
    uploadAttachment: (id: string, file: File): Promise<Attachment> => {
        const formData = new FormData();
        formData.append('file', file);
        return api<Attachment>(`/tickets/${id}/attachments`, {
            method: 'POST',
            body: formData,
        });
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
    getAll: (search?: string): Promise<User[]> => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return api<User[]>(`/users${query}`);
    },
    getByRole: (role: string): Promise<User[]> =>
        api<User[]>(`/users?role=${encodeURIComponent(role)}`),
    create: (userData: Partial<User> & { password?: string }): Promise<User> =>
        api<User>('/users', { method: 'POST', body: JSON.stringify(userData) }),
    update: (id: string, updates: Partial<User> & { password?: string }): Promise<User> =>
        api<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
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
