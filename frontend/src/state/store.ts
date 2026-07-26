import { Article, Stats, Ticket, UserSession } from '../types';

const SESSION_KEY = 'itsupport_session';

export interface AppState {
    currentUser: UserSession | null;
    tickets: Ticket[];
    articles: Article[];
    stats: Stats | null;
    activeFilter: string;
    activePriority: string;
    activeSeverity: string;
    activeDepartment: string;
    searchQuery: string;
    currentView: string; // 'dashboard' | 'tickets' | 'kb' | 'stats' | 'admin'
}

class Store {
    private state: AppState = {
        currentUser: null,
        tickets: [],
        articles: [],
        stats: null,
        activeFilter: 'all',
        activePriority: 'all',
        activeSeverity: 'all',
        activeDepartment: 'all',
        searchQuery: '',
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

    /** Fires only when navigation view changes (setView). */
    public subscribeToView(listener: (view: string) => void): () => void {
        this.viewListeners.push(listener);
        return () => {
            this.viewListeners = this.viewListeners.filter(l => l !== listener);
        };
    }

    /** Fires only when login session changes (setSession). */
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

    /** Updates cached tickets without notifying subscribers (no page reload). */
    public setTickets(tickets: Ticket[]): void {
        this.state.tickets = tickets;
    }

    /** Updates cached articles without notifying subscribers. */
    public setArticles(articles: Article[]): void {
        this.state.articles = articles;
    }

    /** Updates cached stats without notifying subscribers. */
    public setStats(stats: Stats): void {
        this.state.stats = stats;
    }

    public setFilter(status: string): void {
        this.state.activeFilter = status;
    }

    public setDepartment(dept: string): void {
        this.state.activeDepartment = dept;
    }

    public setSearch(query: string): void {
        this.state.searchQuery = query;
    }

    /** Triggers view subscribers when the view changes, or when force is true. */
    public setView(view: string, options?: { force?: boolean }): void {
        const unchanged = this.state.currentView === view;
        this.state.currentView = view;
        if (!unchanged || options?.force) {
            this.viewListeners.forEach(l => l(view));
        }
    }
}

export const store = new Store();
