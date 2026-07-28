import { UserSession } from '../types';

const SESSION_KEY = 'itsupport_session';

interface AppState {
    currentUser: UserSession | null;
    currentView: string;
}

class Store {
    private state: AppState = {
        currentUser: null,
        currentView: 'dashboard',
    };

    private viewListeners: Array<(view: string) => void> = [];
    private sessionListeners: Array<() => void> = [];

    constructor() {
        this.loadSession();
    }

    public getState(): AppState {
        return this.state;
    }

    public subscribeToView(listener: (view: string) => void): () => void {
        this.viewListeners.push(listener);
        return () => {
            this.viewListeners = this.viewListeners.filter(l => l !== listener);
        };
    }

    public subscribeToSession(listener: () => void): () => void {
        this.sessionListeners.push(listener);
        return () => {
            this.sessionListeners = this.sessionListeners.filter(l => l !== listener);
        };
    }

    public loadSession(): UserSession | null {
        try {
            let raw = localStorage.getItem(SESSION_KEY);
            if (!raw) {
                raw = sessionStorage.getItem(SESSION_KEY);
            }
            if (raw) {
                this.state.currentUser = JSON.parse(raw);
            }
        } catch {
            this.state.currentUser = null;
        }
        return this.state.currentUser;
    }

    public setSession(session: UserSession | null, rememberMe = false): void {
        this.state.currentUser = session;
        if (session) {
            const raw = JSON.stringify(session);
            if (rememberMe) {
                localStorage.setItem(SESSION_KEY, raw);
                sessionStorage.removeItem(SESSION_KEY);
            } else {
                sessionStorage.setItem(SESSION_KEY, raw);
                localStorage.removeItem(SESSION_KEY);
            }
        } else {
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);
        }
        this.sessionListeners.forEach(l => l());
    }

    public setView(view: string, options?: { force?: boolean }): void {
        const unchanged = this.state.currentView === view;
        this.state.currentView = view;
        if (!unchanged || options?.force) {
            this.viewListeners.forEach(l => l(view));
        }
    }
}

export const store = new Store();
