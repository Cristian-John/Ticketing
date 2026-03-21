/* ===================================
   IT Support Ticketing System
   Application Logic — API-Driven
   =================================== */

(function () {
    'use strict';

    // ==================== TYPES & INTERFACES ====================

    interface Ticket {
        id: string;
        title: string;
        description: string;
        category: string;
        department: string;
        priority: string;
        severity: string;
        status: string;
        assignee: string;
        requester: string;
        rating: number | null;
        ratingComment: string | null;
        ratingRequested?: number;
        createdAt: string;
        updatedAt: string;
        dueAt?: string;
        notes?: Note[];
        attachments?: Attachment[];
    }

    interface Article {
        id: string;
        title: string;
        content: string;
        category: string;
        author: string;
        createdAt: string;
        updatedAt: string;
    }

    interface Note {
        id: number;
        ticketId: string;
        text: string;
        author: string;
        time: string;
    }

    interface Attachment {
        id: string;
        ticketId: string;
        filename: string;
        originalname: string;
        size: number;
        uploadedAt: string;
    }

    interface UserSession {
        username: string;
        role: string;
    }

    interface Stats {
        total: number;
        open: number;
        inProgress: number;
        resolved: number;
        severe: number;
        critical: number;
        avgRating: string | null;
        rated: number;
    }

    // ==================== CONSTANTS ====================

    const DEPARTMENTS = [
        'Executive', 'Marketing', 'I-Wallet', 'Admin', 'I-Tech',
        'Joint Ventures', 'IT', 'Customer Care', 'Secretary',
        'Real Estate', 'Corporate'
    ];

    const AGENTS = ['Sean Khayle', 'CJ', 'Jeremiah', 'Clarence'];

    function getAssignees(ticket: Ticket): string[] {
        if (!ticket.assignee || ticket.assignee === 'Unassigned') return [];
        return ticket.assignee.split(',').map(a => a.trim()).filter(Boolean);
    }

    function formatAssignees(ticket: Ticket): string {
        const list = getAssignees(ticket);
        return list.length > 0 ? list.join(', ') : 'Unassigned';
    }

    const SESSION_KEY = 'itsupport_session';
    const API = '/api';

    // ==================== API LAYER ====================

    async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
        const res = await fetch(`${API}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...opts,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    }

    const ticketsAPI = {
        list: (params: Record<string, string> = {}): Promise<Ticket[]> => {
            const qs = new URLSearchParams(params).toString();
            return api<Ticket[]>(`/tickets${qs ? '?' + qs : ''}`);
        },
        get: (id: string): Promise<Ticket> => api<Ticket>(`/tickets/${id}`),
        create: (data: Partial<Ticket>): Promise<Ticket> => api<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Ticket>): Promise<Ticket> => api<Ticket>(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string): Promise<{ success: boolean; id: string }> => api<{ success: boolean; id: string }>(`/tickets/${id}`, { method: 'DELETE' }),
        addNote: (id: string, data: { text: string; author: string }): Promise<Note> => api<Note>(`/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),
        uploadAttachment: async (id: string, file: File): Promise<Attachment> => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API}/tickets/${id}/attachments`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        },
        stats: (): Promise<Stats> => api<Stats>('/stats'),
    };

    const articlesAPI = {
        list: (search?: string): Promise<Article[]> => {
            const qs = search ? `?search=${encodeURIComponent(search)}` : '';
            return api<Article[]>(`/articles${qs}`);
        },
        create: (data: Partial<Article>): Promise<Article> => api<Article>('/articles', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Article>): Promise<Article> => api<Article>(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string): Promise<{ success: boolean; id: string }> => api<{ success: boolean; id: string }>(`/articles/${id}`, { method: 'DELETE' }),
        reorder: (order: string[]): Promise<{ success: boolean }> => api<{ success: boolean }>('/articles/reorder', { method: 'PUT', body: JSON.stringify({ order }) }),
    };

    // ==================== SESSION ====================

    function getSession(): UserSession | null {
        try {
            const s = sessionStorage.getItem(SESSION_KEY);
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    }
    function setSession(s: UserSession) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
    function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

    // ==================== DOM HELPERS ====================

    const $ = (s: string, p?: Element | Document): HTMLElement | null => (p || document).querySelector(s);
    const $$ = (s: string, p?: Element | Document): NodeListOf<HTMLElement> => (p || document).querySelectorAll(s);

    function el(tag: string, attrs: Record<string, any> = {}, children: (Node | string | null | false)[] = []): HTMLElement {
        const e = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
            else if (k === 'className') e.className = v;
            else if (k.startsWith('on') && typeof v === 'function') {
                e.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
            }
            else e.setAttribute(k, String(v));
        }
        for (const c of children) {
            if (typeof c === 'string') e.appendChild(document.createTextNode(c));
            else if (c instanceof Node) e.appendChild(c);
        }
        return e;
    }

    function html(container: HTMLElement, htmlStr: string) {
        container.innerHTML = htmlStr;
    }

    // ==================== FORMATTERS ====================

    function formatDate(iso: string | null | undefined): string {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    }

    function formatDateTime(iso: string | null | undefined): string {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function esc(str: string | null | undefined): string {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function statusClass(s: string): string {
        const map: Record<string, string> = { 'Open': 'open', 'In Progress': 'in-progress', 'Resolved': 'resolved', 'Closed': 'closed' };
        return 'badge badge-' + (map[s] || 'open');
    }

    function severityClass(s: string | null | undefined): string {
        return 'badge badge-' + (s || 'moderate').toLowerCase();
    }

    function getSLAHtml(ticket: Ticket): string {
        if (ticket.status === 'Resolved' || ticket.status === 'Closed') return '';
        if (!ticket.dueAt) return '';
        const diff = Date.parse(ticket.dueAt) - Date.now();
        if (diff < 0) return `<span class="badge-sla breached">SLA Breached</span>`;
        if (diff < 3600000 * 2) return `<span class="badge-sla risk">SLA At Risk</span>`;
        return '';
    }

    function getSeverityColor(s: string): string {
        if (s === 'Severe') return 'var(--severity-severe)';
        if (s === 'High') return 'var(--severity-high)';
        if (s === 'Moderate') return 'var(--severity-moderate)';
        return 'var(--severity-low)';
    }

    function starsHTML(n: number, small?: boolean): string {
        let h = `<span class="stars${small ? ' stars-sm' : ''}">`;
        for (let i = 1; i <= 5; i++) h += `<span class="star${i <= n ? '' : ' off'}">⭐</span>`;
        return h + '</span>';
    }

    function isResolved(t: Ticket): boolean {
        return t.status === 'Resolved' || t.status === 'Closed';
    }

    // ==================== AUDIO ====================

    let audioCtx: AudioContext | null = null;
    function getAudioCtx(): AudioContext {
        if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        return audioCtx!;
    }

    function playNewTicketSound() {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45);
        } catch (e) { }
    }

    function playCriticalSound() {
        try {
            const ctx = getAudioCtx();
            const t = ctx.currentTime;
            [0, 0.22, 0.44].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, t + offset);
                osc.frequency.setValueAtTime(550, t + offset + 0.08);
                gain.gain.setValueAtTime(0, t + offset);
                gain.gain.linearRampToValueAtTime(0.10, t + offset + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);
                osc.start(t + offset); osc.stop(t + offset + 0.20);
            });
        } catch (e) { }
    }

    // ==================== TOAST ====================

    const toastContainer = $('#toast-container');

    function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
        if (!toastContainer) return;
        const toast = el('div', { className: `toast toast-${type}` }, [
            type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ',
            ` ${message}`
        ]);
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function showNotifBanner(message: string, type: 'new' | 'critical', ticketId?: string) {
        if (!toastContainer) return;
        const banner = el('div', { className: `notif-banner notif-${type}` });
        banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;cursor:pointer" id="banner-${ticketId || 'x'}">
                <div class="notif-pulse"></div>
                ${esc(message)}
            </div>
            <button class="notif-close">✕</button>
        `;
        toastContainer.appendChild(banner);

        const closeBtn = banner.querySelector('.notif-close') as HTMLElement;
        if (closeBtn) closeBtn.addEventListener('click', () => banner.remove());

        if (ticketId) {
            const bClick = banner.querySelector(`#banner-${ticketId}`) as HTMLElement;
            if (bClick) bClick.addEventListener('click', () => {
                adminView = 'detail';
                selectedTicketId = ticketId;
                renderAdminView();
                banner.remove();
            });
        }

        setTimeout(() => banner.remove(), type === 'critical' ? 20000 : 8000);
    }

    // ==================== SCREEN SWITCHING ====================

    const loginScreen = $('#login-screen');
    const clientScreen = $('#client-screen');
    const adminScreen = $('#admin-screen');

    function showScreen(screen: HTMLElement | null) {
        if (!screen) return;
        $$('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    // ==================== STATE ====================

    let currentUser: UserSession | null = null;
    let allTickets: Ticket[] = [];
    let allArticles: Article[] = [];
    let prevTicketCount = 0;
    let adminView = 'dashboard';
    let clientView = 'my-tickets';
    let selectedTicketId: string | null = null;
    let ratingPromptShown = false;

    // ==================== AUTH ====================

    const loginForm = $('#login-form') as HTMLFormElement;
    const passwordGroup = $('#password-group');
    const usernameGroup = $('#username-group');
    const loginRole = $('#login-role') as HTMLSelectElement;

    if (loginRole && passwordGroup && usernameGroup) {
        loginRole.addEventListener('change', function () {
            if (this.value === 'admin') {
                passwordGroup.style.display = '';
                usernameGroup.style.display = 'none';
                $('#login-password')?.setAttribute('required', 'true');
                $('#login-username')?.removeAttribute('required');
            } else {
                passwordGroup.style.display = 'none';
                usernameGroup.style.display = '';
                $('#login-password')?.removeAttribute('required');
                $('#login-username')?.setAttribute('required', 'true');
                const p = $('#login-password') as HTMLInputElement;
                if (p) p.value = '';
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const usernameInput = $('#login-username') as HTMLInputElement;
            const roleInput = $('#login-role') as HTMLSelectElement;
            const passInput = $('#login-password') as HTMLInputElement;
            const loginBtn = $('#login-btn') as HTMLButtonElement;

            const role = roleInput?.value;
            let username = '';

            if (role === 'admin') {
                const password = passInput?.value.trim();
                if (!password) {
                    showToast('Password is required for admin login', 'error');
                    return;
                }
                // Validate password via backend API
                try {
                    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Signing in...'; }
                    await api('/login', { method: 'POST', body: JSON.stringify({ role: 'admin', password }) });
                } catch (err: any) {
                    showToast(err.message || 'Incorrect admin password', 'error');
                    if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = '<span>Sign In</span>'; }
                    return;
                } finally {
                    if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = '<span>Sign In</span>'; }
                }
                username = 'Admin';
            } else {
                username = usernameInput?.value.trim();
                if (!username) {
                    showToast('Please enter your name', 'error');
                    return;
                }
            }

            currentUser = { username, role };
            setSession(currentUser);

            if (role === 'admin') enterAdmin();
            else enterClient();

            loginForm.reset();
            if (passwordGroup) passwordGroup.style.display = 'none';
            if (usernameGroup) usernameGroup.style.display = '';
            // Dispatch change event to reset form validation state
            if (loginRole) loginRole.dispatchEvent(new Event('change'));
            showToast(`Welcome, ${username}!`, 'success');
        });
    }

    function logout() {
        clearSession();
        currentUser = null;
        allTickets = [];
        prevTicketCount = 0;
        showScreen(loginScreen);
        showToast('Logged out successfully', 'info');
    }

    $('#client-logout-btn')?.addEventListener('click', logout);
    $('#admin-logout-btn')?.addEventListener('click', logout);

    // ==================== ENTER CLIENT ====================

    async function enterClient() {
        currentUser = getSession();
        if (!currentUser) return;
        const sn = $('#client-sidebar-name');
        if (sn) sn.textContent = currentUser.username;
        showScreen(clientScreen);
        clientView = 'my-tickets';
        await loadAndRenderClient();
    }

    async function loadAndRenderClient() {
        try {
            allTickets = await ticketsAPI.list();
        } catch (err) {
            showToast('Failed to load tickets', 'error');
            return;
        }
        renderClientView();
    }

    function renderClientView() {
        if (!currentUser) return;
        const myUsername = currentUser!.username.toLowerCase();
        const mine = allTickets.filter(t => t.requester.toLowerCase() === myUsername);

        const setStat = (id: string, val: number) => { const e = $(`#${id}`); if (e) e.textContent = String(val); };
        setStat('cs-open', mine.filter(t => t.status === 'Open').length);
        setStat('cs-active', mine.filter(t => t.status === 'In Progress').length);
        setStat('cs-resolved', mine.filter(t => isResolved(t)).length);

        const toRate = mine.filter(t => isResolved(t) && t.rating === null && t.ratingRequested === 1).length;
        const rateBadge = $('#client-to-rate-badge');
        if (rateBadge) {
            if (toRate > 0) {
                rateBadge.style.display = '';
                rateBadge.textContent = `${toRate} to rate`;
            } else {
                rateBadge.style.display = 'none';
            }
        }

        const content = $('#client-content');
        const titleEl = $('#client-page-title');
        if (!content || !titleEl) return;

        if (clientView === 'my-tickets') {
            titleEl.textContent = 'My Tickets';
            if (mine.length === 0) {
                html(content, `
                    <div class="empty-state">
                        <div class="empty-state-icon">🎫</div>
                        <div class="empty-state-title">No tickets yet</div>
                        <div>Submit your first IT support request</div>
                        <br>
                        <button class="btn btn-primary" id="empty-submit-btn">Submit a Ticket</button>
                    </div>
                `);
                $('#empty-submit-btn')?.addEventListener('click', () => openTicketModal());
            } else {
                renderClientList(content, mine);

                if (!ratingPromptShown) {
                    const unrated = mine.find(t => isResolved(t) && t.rating === null && t.ratingRequested === 1);
                    if (unrated) {
                        ratingPromptShown = true;
                        setTimeout(() => openRatingModal(unrated), 400);
                    }
                }
            }
        } else if (clientView === 'detail' && selectedTicketId) {
            titleEl.textContent = 'Ticket Detail';
            const ticket = allTickets.find(t => t.id === selectedTicketId);
            if (ticket) {
                renderClientDetail(content, ticket);
                if (!ratingPromptShown && isResolved(ticket) && ticket.rating === null && ticket.ratingRequested === 1) {
                    ratingPromptShown = true;
                    setTimeout(() => openRatingModal(ticket), 400);
                }
            }
            else { clientView = 'my-tickets'; renderClientView(); }
        } else if (clientView === 'knowledge-base') {
            titleEl.textContent = 'Knowledge Base';
            renderClientKnowledgeBase(content);
        }
    }

    function renderClientList(container: HTMLElement, tickets: Ticket[]) {
        container.innerHTML = '';
        tickets.forEach(t => {
            const done = isResolved(t);
            const notes = t.notes || [];
            const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;

            const card = el('div', { className: 'client-card', style: { borderLeft: `3px solid ${getSeverityColor(t.severity)}` } });
            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                    <div style="flex:1;min-width:0">
                        <div style="display:flex;gap:7px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
                            <span style="font-family:monospace;font-size:10px;color:var(--text-muted)">${esc(t.id)}</span>
                            <span class="${statusClass(t.status)}">${esc(t.status)}</span>
                            <span class="${severityClass(t.severity)}">${esc(t.severity)}</span>
                            <span class="badge-dept">${esc(t.department)}</span>
                        </div>
                        <div style="font-weight:600;font-size:15px;color:var(--text-heading);margin-bottom:4px">${esc(t.title)}${getSLAHtml(t)}</div>
                        <div style="font-size:12px;color:var(--text-muted)">${esc(t.category)} · ${formatAssignees(t)} · ${formatDate(t.updatedAt)}</div>
                        ${lastNote ? `<div class="latest-note">💬 ${esc(lastNote.text.slice(0, 90))}${lastNote.text.length > 90 ? '…' : ''}</div>` : ''}
                    </div>
                    <div style="flex-shrink:0;text-align:right">
                        ${done ? (t.rating !== null
                    ? `<div>${starsHTML(t.rating, true)}<div style="font-size:10px;color:var(--text-muted);margin-top:1px">Your rating</div></div>`
                    : `<button class="btn-rate rate-btn" data-id="${esc(t.id)}">⭐ Rate</button>`)
                    : ''}
                    </div>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).classList.contains('rate-btn')) return;
                selectedTicketId = t.id;
                clientView = 'detail';
                renderClientView();
            });
            container.appendChild(card);
        });

        container.querySelectorAll('.rate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ticket = allTickets.find(t => t.id === (btn as HTMLElement).dataset.id);
                if (ticket) openRatingModal(ticket);
            });
        });
    }

    function renderClientDetail(container: HTMLElement, ticket: Ticket) {
        const done = isResolved(ticket);
        const notes = ticket.notes || [];

        container.innerHTML = `
            <div class="detail-header">
                <div>
                    <div class="detail-id">${esc(ticket.id)}</div>
                    <h2 class="detail-title">${esc(ticket.title)}</h2>
                    <div class="detail-badges">
                        <span class="${severityClass(ticket.severity)}">${esc(ticket.severity)}</span>
                        <span class="${statusClass(ticket.status)}">${esc(ticket.status)}</span>
                        <span class="badge-cat">${esc(ticket.category)}</span>
                        <span class="badge-dept">${esc(ticket.department)}</span>
                        ${getSLAHtml(ticket)}
                    </div>
                </div>
                <button class="btn-back" id="client-back-btn">← Back</button>
            </div>
            <div class="detail-grid detail-grid-client">
                <div class="detail-main">
                    <div class="panel">
                        <div class="panel-header">Issue Description</div>
                        <p style="color:var(--text-secondary);line-height:1.75;margin:0;font-size:14px;white-space:pre-wrap">${esc(ticket.description)}</p>
                        ${(ticket.attachments && ticket.attachments.length > 0) ? `
                            <div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border)">
                                <strong style="color:var(--text-heading);font-size:13px;display:block;margin-bottom:8px">Attachments</strong>
                                <div style="display:flex;gap:10px;flex-wrap:wrap">
                                    ${ticket.attachments.map((a: Attachment) => `
                                        <a href="/uploads/${a.filename}" target="_blank" class="attachment-link">
                                            📎 ${esc(a.originalname)} <span style="opacity:0.6;font-size:10px">(${(a.size/1024).toFixed(1)}kb)</span>
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="panel">
                        <div class="panel-header" style="color:var(--status-progress)">💬 Conversation</div>
                        ${notes.length > 0 ? notes.map(n => `
                            <div class="note-item ${n.author.toLowerCase() === currentUser?.username.toLowerCase() ? 'note-mine' : ''}">
                                <span class="note-author">${esc(n.author)}<span class="note-time">${esc(n.time)}</span></span>
                                <div class="note-text">${esc(n.text)}</div>
                            </div>
                        `).join('') : '<p style="color:var(--text-muted);font-size:13px;margin:0 0 12px">No messages yet. Send a message to IT Support below.</p>'}
                        ${!done ? `
                        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
                            <textarea id="client-reply-text" rows="3" placeholder="Type your reply or question..." style="width:100%;resize:vertical;margin-bottom:8px"></textarea>
                            <div style="display:flex;gap:8px;align-items:center">
                                <label class="btn btn-ghost" style="cursor:pointer;font-size:12px;padding:6px 10px" for="client-reply-file">📎 Attach</label>
                                <input type="file" id="client-reply-file" style="display:none">
                                <span id="client-reply-filename" style="font-size:11px;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
                                <button class="btn btn-primary" id="client-reply-btn" style="font-size:12px;padding:6px 16px">Send</button>
                            </div>
                        </div>
                        ` : '<p style="color:var(--text-muted);font-size:11px;margin:12px 0 0;font-style:italic">This ticket is ${ticket.status.toLowerCase()}. Replies are disabled.</p>'}
                    </div>
                    ${done ? `
                    <div class="panel" style="border:1px solid ${ticket.rating !== null ? 'rgba(240,192,64,0.3)' : 'var(--border)'}">
                        <div class="panel-header" style="color:var(--severity-moderate)">⭐ Rate this Service</div>
                        ${ticket.rating !== null ? `
                            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                                ${starsHTML(ticket.rating)}
                                <span style="color:var(--severity-moderate);font-weight:700;font-size:18px">${ticket.rating}/5</span>
                                <span style="color:var(--status-resolved);font-size:12px">✓ Submitted</span>
                            </div>
                            ${ticket.ratingComment ? `<div class="rating-comment">"${esc(ticket.ratingComment)}"</div>` : ''}
                        ` : `
                            <p style="color:var(--text-muted);font-size:13px;margin:0 0 12px">This ticket has been resolved. How was our support?</p>
                            <button class="btn-rate" id="detail-rate-btn">⭐ Leave a Rating</button>
                        `}
                    </div>` : ''}
                </div>
                <div class="detail-side">
                    <div class="panel">
                        <div class="panel-header">Ticket Info</div>
                        ${[['ID', ticket.id], ['Department', ticket.department], ['Category', ticket.category], ['Severity', ticket.severity], ['Assignee(s)', formatAssignees(ticket)], ['Submitted', formatDate(ticket.createdAt)], ['Updated', formatDate(ticket.updatedAt)], ['SLA Due', formatDateTime(ticket.dueAt)]].map(([k, v]) => `
                            <div class="detail-info-row">
                                <span class="detail-info-key">${k}</span>
                                <span class="detail-info-val">${esc(v)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        $('#client-back-btn')?.addEventListener('click', () => {
            clientView = 'my-tickets';
            selectedTicketId = null;
            renderClientView();
        });

        // Client reply handler
        const replyFileInput = $('#client-reply-file') as HTMLInputElement;
        const replyFilename = $('#client-reply-filename');
        if (replyFileInput && replyFilename) {
            replyFileInput.addEventListener('change', () => {
                replyFilename.textContent = replyFileInput.files?.[0]?.name || '';
            });
        }

        $('#client-reply-btn')?.addEventListener('click', async () => {
            const txt = ($('#client-reply-text') as HTMLTextAreaElement)?.value.trim();
            const fileInput = $('#client-reply-file') as HTMLInputElement;
            const file = fileInput?.files?.[0];
            if (!txt && !file) return;

            try {
                const btn = $('#client-reply-btn') as HTMLButtonElement;
                if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

                if (txt) {
                    await ticketsAPI.addNote(ticket.id, { text: txt, author: currentUser?.username || 'User' });
                }
                if (file) {
                    await ticketsAPI.uploadAttachment(ticket.id, file);
                }

                showToast('Reply sent!');
                await loadAndRenderClient();
            } catch (err) {
                showToast('Failed to send reply', 'error');
                const btn = $('#client-reply-btn') as HTMLButtonElement;
                if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
            }
        });

        const rateBtn = $('#detail-rate-btn');
        if (rateBtn) {
            rateBtn.addEventListener('click', () => openRatingModal(ticket));
        }
    }

    $$('#client-sidebar .sb-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('#client-sidebar .sb-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            clientView = btn.dataset.view || 'my-tickets';
            selectedTicketId = null;
            renderClientView();
        });
    });

    // ==================== ENTER ADMIN ====================

    async function enterAdmin() {
        currentUser = getSession();
        showScreen(adminScreen);
        adminView = 'dashboard';
        updateAdminNav();
        await loadAndRenderAdmin();
    }

    async function loadAndRenderAdmin() {
        try {
            allTickets = await ticketsAPI.list();
        } catch (err) {
            showToast('Failed to load tickets', 'error');
            return;
        }

        if (prevTicketCount > 0 && allTickets.length > prevTicketCount) {
            const newest = allTickets[0];
            if (newest.severity === 'Severe') {
                playCriticalSound();
                showNotifBanner(`🔥 SEVERE TICKET: ${newest.title}`, 'critical', newest.id);
            } else {
                playNewTicketSound();
                showNotifBanner(`🎫 New ticket received: ${newest.title}`, 'new', newest.id);
            }
        }
        prevTicketCount = allTickets.length;

        updateAdminSidebar();
        renderAdminView();
    }

    function updateAdminSidebar() {
        const open = allTickets.filter(t => t.status === 'Open').length;
        const inProg = allTickets.filter(t => t.status === 'In Progress').length;
        const severe = allTickets.filter(t => t.severity === 'Severe' && !isResolved(t)).length;
        const resolved = allTickets.filter(t => isResolved(t)).length;
        const rated = allTickets.filter(t => t.rating !== null);
        const avg = rated.length ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1) : '—';

        const setStat = (id: string, val: string | number) => { const e = $(`#${id}`); if (e) e.textContent = String(val); };
        setStat('as-open', open);
        setStat('as-progress', inProg);
        setStat('as-severe', severe);
        setStat('as-resolved', resolved);
        setStat('as-rating', avg + (avg !== '—' ? '★' : ''));

        const badge = $('#admin-open-badge');
        if (badge) {
            if (open > 0) { badge.style.display = ''; badge.textContent = String(open); }
            else badge.style.display = 'none';
        }
    }

    function updateAdminNav() {
        $$('#admin-sidebar .sb-nav-btn').forEach(b => {
             b.classList.toggle('active', b.dataset.view === adminView || (adminView === 'detail' && b.dataset.view === 'all-tickets'));
        });
        const filters = $('#admin-filters');
        if (filters) filters.style.display = (adminView === 'all-tickets' || adminView === 'detail') ? '' : 'none';
    }

    function renderAdminView() {
        const content = $('#admin-content');
        const titleEl = $('#admin-page-title');
        if (!content || !titleEl) return;

        updateAdminNav();

        if (adminView === 'dashboard') {
            titleEl.textContent = 'Dashboard';
            renderAdminDashboard(content);
        } else if (adminView === 'all-tickets') {
            titleEl.textContent = 'All Tickets';
            renderAdminTicketTable(content, getFilteredTickets());
        } else if (adminView === 'resolved') {
            titleEl.textContent = 'Resolved & Ratings';
            renderResolvedView(content);
        } else if (adminView === 'detail' && selectedTicketId) {
            titleEl.textContent = 'Ticket Detail';
            const ticket = allTickets.find(t => t.id === selectedTicketId);
            if (ticket) renderAdminDetail(content, ticket);
            else { adminView = 'all-tickets'; renderAdminView(); }
        } else if (adminView === 'knowledge-base') {
            titleEl.textContent = 'Knowledge Base';
            renderAdminKnowledgeBase(content);
        }
    }

    function getFilteredTickets(): Ticket[] {
        const status = ($('#admin-filter-status') as HTMLSelectElement)?.value || 'all';
        const severity = ($('#admin-filter-severity') as HTMLSelectElement)?.value || 'all';
        const dept = ($('#admin-filter-dept') as HTMLSelectElement)?.value || 'all';
        const search = ($('#admin-search') as HTMLInputElement)?.value || '';

        return allTickets
            .filter(t => status === 'all' || t.status === status)
            .filter(t => severity === 'all' || t.severity === severity)
            .filter(t => dept === 'all' || t.department === dept)
            .filter(t => !search || [t.id, t.title, t.requester, t.department, t.description || ''].join(' ').toLowerCase().includes(search.toLowerCase()));
    }

    $$('#admin-sidebar .sb-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            adminView = btn.dataset.view || 'dashboard';
            selectedTicketId = null;
            updateAdminNav();
            renderAdminView();
        });
    });

    ['admin-search', 'admin-filter-status', 'admin-filter-severity', 'admin-filter-dept'].forEach(id => {
        const el = $(`#${id}`);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
            if (adminView === 'all-tickets') renderAdminView();
        });
    });

    function renderAdminDashboard(container: HTMLElement) {
        const total = allTickets.length;
        const open = allTickets.filter(t => t.status === 'Open').length;
        const inProg = allTickets.filter(t => t.status === 'In Progress').length;
        const severe = allTickets.filter(t => t.severity === 'Severe' && !isResolved(t)).length;
        const rated = allTickets.filter(t => t.rating !== null);
        const avg = rated.length ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1) : '—';

        const severeTickets = allTickets.filter(t => t.severity === 'Severe' && !isResolved(t));
        const recent = [...allTickets].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 5);
        const byDept = DEPARTMENTS.map(d => ({ d, n: allTickets.filter(t => t.department === d && !isResolved(t)).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
        const topRated = [...allTickets].filter(t => t.rating !== null).sort((a, b) => (b.rating as number) - (a.rating as number)).slice(0, 3);
        const maxN = Math.max(...byDept.map(x => x.n), 1);

        container.innerHTML = `
            <div class="stats-grid">
                ${[
                { l: 'Total', v: total, c: '#ab91ff', i: '🎫' },
                { l: 'Open', v: open, c: 'var(--status-open)', i: '📂' },
                { l: 'In Progress', v: inProg, c: 'var(--status-progress)', i: '⚙️' },
                { l: 'Severe', v: severe, c: 'var(--severity-severe)', i: '🔥' },
                { l: 'Avg Rating', v: avg + (avg !== '—' ? '★' : ''), c: 'var(--severity-moderate)', i: '⭐' },
            ].map(c => `
                    <div class="stat-card" style="border-top:3px solid ${c.c}">
                        <div class="stat-icon">${c.i}</div>
                        <div class="stat-number" style="color:${c.c}">${c.v}</div>
                        <div class="stat-label">${c.l}</div>
                    </div>
                `).join('')}
            </div>

            <div class="dash-grid-2">
                <div class="panel">
                    <div class="panel-header" style="color:var(--severity-severe)">🔥 Severe Issues</div>
                    <div id="dash-severe-list"></div>
                </div>
                <div class="panel">
                    <div class="panel-header" style="color:var(--status-progress)">
                        🕐 Recent
                        <button class="panel-link" id="dash-view-all">View all →</button>
                    </div>
                    <div id="dash-recent-list"></div>
                </div>
            </div>

            <div class="dash-grid-2">
                <div class="panel">
                    <div class="panel-header" style="color:#ab91ff">🏢 Active by Department</div>
                    <div id="dash-dept-chart"></div>
                </div>
                <div class="panel">
                    <div class="panel-header" style="color:var(--severity-moderate)">
                        ⭐ Recent Ratings
                        <button class="panel-link" id="dash-view-resolved">View all →</button>
                    </div>
                    <div id="dash-ratings-list"></div>
                </div>
            </div>
        `;

        const severeList = $('#dash-severe-list');
        if (severeList) {
            if (severeTickets.length === 0) {
                severeList.innerHTML = '<div class="empty-state" style="padding:18px 0">All clear 🎉</div>';
            } else {
                severeTickets.forEach(t => severeList.appendChild(miniCard(t, false)));
            }
        }

        const recentList = $('#dash-recent-list');
        if (recentList) recent.forEach(t => recentList.appendChild(miniCard(t, true)));

        const deptChart = $('#dash-dept-chart');
        if (deptChart) {
            if (byDept.length === 0) {
                deptChart.innerHTML = '<div class="empty-state" style="padding:18px 0">No active tickets</div>';
            } else {
                byDept.forEach(({ d, n }) => {
                    const row = el('div', { className: 'dept-bar-row' });
                    row.innerHTML = `
                        <span class="dept-bar-label">${esc(d)}</span>
                        <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${(n / maxN) * 100}%"></div></div>
                        <span class="dept-bar-count">${n}</span>
                    `;
                    deptChart.appendChild(row);
                });
            }
        }

        const ratingsList = $('#dash-ratings-list');
        if (ratingsList) {
            if (topRated.length === 0) {
                ratingsList.innerHTML = '<div class="empty-state" style="padding:18px 0">No ratings yet</div>';
            } else {
                topRated.forEach(t => {
                    const row = el('div', { style: { padding: '8px 0', borderBottom: '1px solid var(--border)' } });
                    row.innerHTML = `
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:12px;color:var(--text-primary);font-weight:600">${esc(t.title.slice(0, 36))}${t.title.length > 36 ? '…' : ''}</span>
                            ${starsHTML(t.rating as number, true)}
                        </div>
                        ${t.ratingComment ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;font-style:italic">"${esc(t.ratingComment)}"</div>` : ''}
                    `;
                    ratingsList.appendChild(row);
                });
            }
        }

        $('#dash-view-all')?.addEventListener('click', () => { adminView = 'all-tickets'; renderAdminView(); });
        $('#dash-view-resolved')?.addEventListener('click', () => { adminView = 'resolved'; renderAdminView(); });
    }

    function miniCard(ticket: Ticket, compact: boolean): HTMLElement {
        const card = el('div', { className: 'mini-card', style: { borderLeft: `3px solid ${getSeverityColor(ticket.severity)}` } });
        card.innerHTML = `
            <div class="mini-card-top">
                <span class="mini-card-id">${esc(ticket.id)}</span>
                <span class="${statusClass(ticket.status)}">${esc(ticket.status)}</span>
            </div>
            <div class="mini-card-title">${esc(ticket.title)}${getSLAHtml(ticket)}</div>
            ${!compact ? `<div class="mini-card-desc">${esc((ticket.description || '').slice(0, 65))}${(ticket.description || '').length > 65 ? '…' : ''}</div>` : ''}
            <div class="mini-card-badges">
                <span class="${severityClass(ticket.severity)}">${esc(ticket.severity)}</span>
                <span class="badge-dept">${esc(ticket.department)}</span>
                ${ticket.rating != null ? `<span style="margin-left:auto;font-size:10px;color:var(--severity-moderate)">${ticket.rating}★</span>` : ''}
            </div>
        `;
        card.addEventListener('click', () => {
            adminView = 'detail';
            selectedTicketId = ticket.id;
            renderAdminView();
        });
        return card;
    }

    function renderAdminTicketTable(container: HTMLElement, tickets: Ticket[]) {
        container.innerHTML = `
            <div class="table-wrap">
                <div class="table-head">
                    <span style="flex:0 0 88px">ID</span>
                    <span style="flex:1">Title</span>
                    <span style="flex:0 0 110px">Department</span>
                    <span style="flex:0 0 86px">Severity</span>
                    <span style="flex:0 0 108px">Status</span>
                    <span style="flex:0 0 100px">Requester</span>
                    <span style="flex:0 0 56px">Rating</span>
                    <span style="flex:0 0 86px">Updated</span>
                </div>
                <div id="ticket-table-body"></div>
            </div>
        `;
        const body = $('#ticket-table-body');
        if (!body) return;
        
        if (tickets.length === 0) {
            body.innerHTML = '<div class="empty-state" style="padding:30px">No tickets found.</div>';
            return;
        }
        tickets.forEach(t => {
            const row = el('div', { className: 'table-row' });
            row.innerHTML = `
                <span style="flex:0 0 88px;font-family:monospace;font-size:10px;color:var(--text-muted)">${esc(t.id)}</span>
                <span style="flex:1;font-weight:600;color:var(--text-heading);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}${getSLAHtml(t)}</span>
                <span style="flex:0 0 110px"><span class="badge-dept">${esc(t.department)}</span></span>
                <span style="flex:0 0 86px"><span class="${severityClass(t.severity)}">${esc(t.severity)}</span></span>
                <span style="flex:0 0 108px"><span class="${statusClass(t.status)}">${esc(t.status)}</span></span>
                <span style="flex:0 0 100px;color:var(--text-muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.requester)}</span>
                <span style="flex:0 0 56px;color:var(--severity-moderate);font-size:12px">${t.rating != null ? t.rating + '★' : '—'}</span>
                <span style="flex:0 0 86px;color:var(--text-muted);font-size:11px">${formatDate(t.updatedAt)}</span>
            `;
            row.addEventListener('click', () => {
                adminView = 'detail';
                selectedTicketId = t.id;
                renderAdminView();
            });
            body.appendChild(row);
        });
    }

    function renderResolvedView(container: HTMLElement) {
        const resolved = allTickets.filter(t => isResolved(t));
        const rated = resolved.filter(t => t.rating !== null);
        const avg = rated.length ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1) : null;

        container.innerHTML = `
            <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
                <div class="stat-card" style="border-top:3px solid var(--status-resolved)">
                    <div class="stat-number" style="color:var(--status-resolved)">${resolved.length}</div>
                    <div class="stat-label">Total Resolved</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--severity-moderate)">
                    <div class="stat-number" style="color:var(--severity-moderate)">${rated.length}</div>
                    <div class="stat-label">Rated Tickets</div>
                </div>
                <div class="stat-card" style="border-top:3px solid var(--severity-moderate)">
                    <div class="stat-number" style="color:var(--severity-moderate)">${avg ? avg + '★' : '—'}</div>
                    <div class="stat-label">Avg Rating</div>
                </div>
            </div>
            <div class="table-wrap" style="margin-top:20px">
                <div class="table-head">
                    <span style="flex:0 0 88px">ID</span>
                    <span style="flex:1">Ticket</span>
                    <span style="flex:0 0 100px">Requester</span>
                    <span style="flex:0 0 100px">Rating</span>
                    <span style="flex:1">Comment</span>
                    <span style="flex:0 0 86px">Resolved</span>
                </div>
                <div id="resolved-table-body"></div>
            </div>
        `;

        const body = $('#resolved-table-body');
        if (!body) return;
        
        if (resolved.length === 0) {
            body.innerHTML = '<div class="empty-state" style="padding:40px 0">No resolved tickets yet</div>';
            return;
        }

        resolved.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).forEach(t => {
            const row = el('div', { className: 'table-row' });
            row.innerHTML = `
                <span style="flex:0 0 88px;font-family:monospace;font-size:10px;color:var(--text-muted)">${esc(t.id)}</span>
                <span style="flex:1;font-weight:600;color:var(--text-heading);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span>
                <span style="flex:0 0 100px;color:var(--text-secondary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.requester)}</span>
                <span style="flex:0 0 100px">${t.rating != null ? starsHTML(t.rating, true) : '<span style="color:var(--text-muted);font-size:12px;font-style:italic">Unrated</span>'}</span>
                <span style="flex:1;color:var(--text-secondary);font-size:12px;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.ratingComment ? '"' + esc(t.ratingComment) + '"' : ''}</span>
                <span style="flex:0 0 86px;color:var(--text-muted);font-size:11px">${formatDate(t.updatedAt)}</span>
            `;
            row.addEventListener('click', () => {
                adminView = 'detail';
                selectedTicketId = t.id;
                renderAdminView();
            });
            body.appendChild(row);
        });
    }

    function renderAdminDetail(container: HTMLElement, ticket: Ticket) {
        const notes = ticket.notes || [];

        container.innerHTML = `
            <div class="detail-header">
                <div>
                    <div class="detail-id">${esc(ticket.id)}</div>
                    <h2 class="detail-title">${esc(ticket.title)}</h2>
                    <div class="detail-badges">
                        <span class="${severityClass(ticket.severity)}">${esc(ticket.severity)}</span>
                        <span class="${statusClass(ticket.status)}">${esc(ticket.status)}</span>
                        <span class="badge-cat">${esc(ticket.category)}</span>
                        <span class="badge-dept">${esc(ticket.department)}</span>
                        ${getSLAHtml(ticket)}
                    </div>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-main">
                    <div class="panel">
                        <div class="panel-header">Issue Details</div>
                        <p style="color:var(--text-secondary);line-height:1.75;margin:0;font-size:14px;white-space:pre-wrap">${esc(ticket.description)}</p>
                        ${(ticket.attachments && ticket.attachments.length > 0) ? `
                            <div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border)">
                                <strong style="color:var(--text-heading);font-size:13px;display:block;margin-bottom:8px">Attachments</strong>
                                <div style="display:flex;gap:10px;flex-wrap:wrap">
                                    ${ticket.attachments.map((a: Attachment) => `
                                        <a href="/uploads/${a.filename}" target="_blank" class="attachment-link">
                                            📎 ${esc(a.originalname)} <span style="opacity:0.6;font-size:10px">(${(a.size/1024).toFixed(1)}kb)</span>
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="panel" style="background:var(--bg-body)">
                        <div class="panel-header">📝 Internal Notes & Support Log</div>
                        ${notes.length === 0 ? '<div class="empty-state" style="padding:20px">No notes yet</div>' : `
                            <div class="notes-list">
                                ${notes.map(n => `
                                    <div class="note-item">
                                        <span class="note-author">${esc(n.author)} <span class="badge" style="font-size:9px;margin-left:5px">Agent</span><span class="note-time">${esc(n.time)}</span></span>
                                        <div class="note-text">${esc(n.text)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                        <div class="note-compose" style="margin-top:20px">
                            <textarea id="reply-text" placeholder="Type a message or internal note..." style="width:100%;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:12px;border-radius:6px;min-height:80px;font-family:inherit;margin-bottom:10px"></textarea>
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <input type="file" id="reply-file" style="font-size:12px;color:var(--text-secondary)">
                                <button class="btn btn-primary" id="btn-reply">Send Reply</button>
                            </div>
                        </div>
                    </div>

                    ${ticket.rating !== null ? `
                    <div class="panel" style="border:1px solid rgba(240,192,64,0.3)">
                        <div class="panel-header" style="color:var(--severity-moderate)">⭐ Client Rating</div>
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                            ${starsHTML(ticket.rating)}
                            <span style="color:var(--severity-moderate);font-weight:700;font-size:18px">${ticket.rating}/5</span>
                        </div>
                        ${ticket.ratingComment ? `<div class="rating-comment">"${esc(ticket.ratingComment)}"</div>` : ''}
                    </div>
                    ` : ''}
                </div>

                <div class="detail-side">
                    <div class="panel">
                        <div class="panel-header">Ticket Properties</div>
                        <div class="prop-group">
                            <label>Status</label>
                            <select id="dt-status">
                                ${['Open', 'In Progress', 'Resolved', 'Closed'].map(s => `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="prop-group">
                            <label>Severity</label>
                            <select id="dt-severity">
                                ${['Low', 'Moderate', 'High', 'Severe'].map(s => `<option value="${s}" ${ticket.severity === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="prop-group">
                            <label>Priority</label>
                            <select id="dt-priority">
                                ${['Low', 'Medium', 'High', 'Critical'].map(s => `<option value="${s}" ${ticket.priority === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="prop-group" style="padding-top:10px;border-top:1px solid var(--border);margin-top:10px">
                            <label>Assignees</label>
                            <div class="assignee-list">
                                ${AGENTS.map(a => `
                                    <label class="assignee-check">
                                        <input type="checkbox" value="${esc(a)}" ${getAssignees(ticket).includes(a) ? 'checked' : ''} class="dt-assignee-cb">
                                        ${esc(a)}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <button class="btn btn-primary" id="admin-update-side-btn" style="width:100%;margin-top:16px;">Update Status/Assignee</button>
                        ${isResolved(ticket) && ticket.rating === null && !ticket.ratingRequested ? `
                            <button class="btn btn-ghost" id="prompt-rating-btn" style="width:100%;margin-top:8px;background:var(--severity-moderate-bg);color:var(--severity-moderate);border:1px solid rgba(240,192,64,0.3)">⭐ Prompt User to Rate</button>
                        ` : ''}
                        ${isResolved(ticket) && ticket.rating === null && ticket.ratingRequested ? `
                            <div style="margin-top:8px;text-align:center;font-size:12px;color:var(--severity-moderate);">Pending User Rating...</div>
                        ` : ''}
                        <button class="btn-back" id="admin-back-btn" style="width:100%;margin-top:8px;">← Back</button>
                    </div>

                    ${!isResolved(ticket) ? `
                    <div class="panel" style="border:1px solid ${ticket.dueAt && Date.parse(ticket.dueAt) < Date.now() ? 'rgba(239,68,68,0.3)' : ticket.dueAt && (Date.parse(ticket.dueAt) - Date.now()) < 7200000 ? 'rgba(249,115,22,0.3)' : 'var(--border)'}">
                        <div class="panel-header" style="color:${ticket.dueAt && Date.parse(ticket.dueAt) < Date.now() ? 'var(--severity-severe)' : 'var(--status-progress)'}">⏱ SLA Management</div>
                        <div class="detail-info-row">
                            <span class="detail-info-key">Due</span>
                            <span class="detail-info-val">${formatDateTime(ticket.dueAt)}</span>
                        </div>
                        <div class="detail-info-row" style="margin-bottom:12px">
                            <span class="detail-info-key">Status</span>
                            <span class="detail-info-val">${ticket.dueAt ? (Date.parse(ticket.dueAt) < Date.now() ? '<span style="color:var(--severity-severe);font-weight:700">⚠ Breached</span>' : (Date.parse(ticket.dueAt) - Date.now()) < 7200000 ? '<span style="color:var(--status-open);font-weight:700">⚡ At Risk</span>' : '<span style="color:var(--status-resolved);font-weight:700">✓ On Track</span>') : '—'}</span>
                        </div>
                        <label style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:700;display:block;margin-bottom:6px">Extend Deadline</label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                            <button class="btn btn-ghost sla-extend-btn" data-hours="2" style="font-size:11px;padding:6px 8px;justify-content:center">+2 hours</button>
                            <button class="btn btn-ghost sla-extend-btn" data-hours="4" style="font-size:11px;padding:6px 8px;justify-content:center">+4 hours</button>
                            <button class="btn btn-ghost sla-extend-btn" data-hours="8" style="font-size:11px;padding:6px 8px;justify-content:center">+8 hours</button>
                            <button class="btn btn-ghost sla-extend-btn" data-hours="24" style="font-size:11px;padding:6px 8px;justify-content:center">+24 hours</button>
                        </div>
                    </div>
                    ` : ''}

                    <div class="panel">
                        <div class="panel-header">Information</div>
                        ${[['Department', ticket.department], ['Requester', ticket.requester], ['Created', formatDateTime(ticket.createdAt)], ['Updated', formatDateTime(ticket.updatedAt)]].map(([k, v]) => `
                            <div class="detail-info-row">
                                <span class="detail-info-key">${k}</span>
                                <span class="detail-info-val">${esc(v)}</span>
                            </div>
                        `).join('')}
                        <button class="btn btn-ghost" id="admin-delete-btn" style="width:100%;margin-top:20px;color:var(--severity-severe);background:rgba(255,82,82,0.1)">DELETE TICKET</button>
                    </div>
                </div>
            </div>
        `;

        $('#admin-back-btn')?.addEventListener('click', () => {
            adminView = 'all-tickets';
            selectedTicketId = null;
            renderAdminView();
        });

        // Prompt rating button - sends notification to client
        $('#prompt-rating-btn')?.addEventListener('click', async () => {
            try {
                const btn = $('#prompt-rating-btn') as HTMLButtonElement;
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Sending...';
                }
                
                // Set ratingRequested flag on the ticket
                await ticketsAPI.update(ticket.id, { ratingRequested: 1 } as any);
                
                // Add a note to prompt the user
                await ticketsAPI.addNote(ticket.id, {
                    text: `Admin prompted user to rate this ticket`,
                    author: currentUser?.username || 'Admin'
                });
                
                showToast('Rating prompt sent to client', 'success');
                await loadAndRenderAdmin();
            } catch (err) {
                showToast('Failed to send prompt', 'error');
                const btn = $('#prompt-rating-btn') as HTMLButtonElement;
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '⭐ Prompt User to Rate';
                }
            }
        });

        $('#btn-reply')?.addEventListener('click', async () => {
            const txt = ($('#reply-text') as HTMLTextAreaElement)?.value.trim();
            const fileInput = $('#reply-file') as HTMLInputElement;
            const file = fileInput?.files?.[0];

            if (!txt && !file) return;
            try {
                const btn = $('#btn-reply') as HTMLButtonElement;
                if (btn) btn.disabled = true;

                if (txt) {
                    await ticketsAPI.addNote(ticket.id, { text: txt, author: currentUser?.username || 'Admin' });
                }

                if (file) {
                    await ticketsAPI.uploadAttachment(ticket.id, file);
                }

                showToast('Reply / Update added');
                await loadAndRenderAdmin();
            } catch (err) {
                showToast('Failed to add reply', 'error');
                const btn = $('#btn-reply') as HTMLButtonElement;
                if (btn) btn.disabled = false;
            }
        });

        $('#admin-update-side-btn')?.addEventListener('click', async () => {
             const stat = ($('#dt-status') as HTMLSelectElement)?.value;
             const sev = ($('#dt-severity') as HTMLSelectElement)?.value;
             const pri = ($('#dt-priority') as HTMLSelectElement)?.value;
             const checkboxes = Array.from($$('.dt-assignee-cb')) as HTMLInputElement[];
             const assigns = checkboxes.filter(cb => cb.checked).map(cb => cb.value).join(', ');

             // Prevent closing a ticket that hasn't been rated
             if (stat === 'Closed' && ticket.rating === null) {
                 showToast('Cannot close ticket — client has not submitted a rating yet', 'error');
                 return;
             }

             try {
                const btn = $('#admin-update-side-btn') as HTMLButtonElement;
                if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }
                
                // Add internal note about change if status changed
                if (stat !== ticket.status) {
                    await ticketsAPI.addNote(ticket.id, {
                        text: `Status changed from "${ticket.status}" to "${stat}"`,
                        author: 'System'
                    });
                }
                
                await ticketsAPI.update(ticket.id, {
                     status: stat,
                     severity: sev,
                     priority: pri,
                     assignee: assigns || 'Unassigned'
                });
                
                showToast('Ticket updated successfully');
                await loadAndRenderAdmin();
             } catch (err) {
                showToast('Failed to update ticket', 'error');
                const btn = $('#admin-update-side-btn') as HTMLButtonElement;
                if (btn) { btn.disabled = false; btn.textContent = 'Update Status/Assignee'; }
             }
        });

        $('#admin-delete-btn')?.addEventListener('click', async () => {
            if (!confirm(`Delete ticket ${ticket.id}? This cannot be undone.`)) return;
            try {
                const btn = $('#admin-delete-btn') as HTMLButtonElement;
                if (btn) btn.disabled = true;
                await ticketsAPI.delete(ticket.id);
                showToast('Ticket deleted');
                adminView = 'all-tickets';
                selectedTicketId = null;
                await loadAndRenderAdmin();
            } catch (err) {
                showToast('Failed to delete ticket', 'error');
                const btn = $('#admin-delete-btn') as HTMLButtonElement;
                if (btn) btn.disabled = false;
            }
        });

        // SLA Extend buttons
        $$('.sla-extend-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const hours = parseInt((btn as HTMLElement).dataset.hours || '0');
                if (!hours) return;
                try {
                    (btn as HTMLButtonElement).disabled = true;
                    const baseTime = ticket.dueAt ? Math.max(Date.parse(ticket.dueAt), Date.now()) : Date.now();
                    const newDue = new Date(baseTime + hours * 3600000).toISOString();
                    await ticketsAPI.addNote(ticket.id, {
                        text: `SLA deadline extended by ${hours} hour${hours > 1 ? 's' : ''} to ${new Date(newDue).toLocaleString()}`,
                        author: currentUser?.username || 'Admin'
                    });
                    await ticketsAPI.update(ticket.id, { dueAt: newDue } as any);
                    showToast(`SLA extended by ${hours} hour${hours > 1 ? 's' : ''}`);
                    await loadAndRenderAdmin();
                } catch (err) {
                    showToast('Failed to extend SLA', 'error');
                    (btn as HTMLButtonElement).disabled = false;
                }
            });
        });
    }

    // ==================== NEW TICKET MODAL ====================

    const createModal = $('#ticket-modal');

    function openTicketModal() {
        if (!createModal) return;
        createModal.classList.add('show');
        const dSel = $('#ticket-department');
        if (dSel) html(dSel, `<option value="" disabled selected>Select Department</option>${DEPARTMENTS.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}<option value="other">Other...</option>`);
        // Reset custom department group state
        const cg = $('#custom-dept-group');
        if (cg) cg.style.display = 'none';
        const cd = $('#ticket-custom-department') as HTMLInputElement;
        if (cd) { cd.removeAttribute('required'); cd.value = ''; }
        ($('#ticket-title') as HTMLInputElement)?.focus();
    }

    function closeTicketModal() {
        if (!createModal) return;
        createModal.classList.remove('show');
        ($('#ticket-form') as HTMLFormElement)?.reset();
        const cg = $('#custom-dept-group');
        if (cg) cg.style.display = 'none';
        const cd = $('#ticket-custom-department') as HTMLInputElement;
        if (cd) { cd.removeAttribute('required'); cd.value = ''; }
    }

    $('#client-new-ticket-btn')?.addEventListener('click', openTicketModal);
    $('#admin-new-ticket-btn')?.addEventListener('click', openTicketModal);
    $$('#close-modal-btn, #cancel-modal-btn').forEach(b => b.addEventListener('click', closeTicketModal));

    const createDept = $('#ticket-department') as HTMLSelectElement;
    const createCustomGroup = $('#custom-dept-group');
    const createCustomDept = $('#ticket-custom-department') as HTMLInputElement;

    if (createDept && createCustomGroup && createCustomDept) {
        createDept.addEventListener('change', function () {
            if (this.value === 'other') {
                createCustomGroup.style.display = '';
                createCustomDept.setAttribute('required', 'true');
            } else {
                createCustomGroup.style.display = 'none';
                createCustomDept.removeAttribute('required');
                createCustomDept.value = '';
            }
        });
    }

    const createForm = $('#ticket-form');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = ($('#ticket-title') as HTMLInputElement)?.value.trim();
            const desc = ($('#ticket-description') as HTMLTextAreaElement)?.value.trim();
            let dept = ($('#ticket-department') as HTMLSelectElement)?.value;
            const sev = ($('#ticket-severity') as HTMLSelectElement)?.value;
            const cat = ($('#ticket-category') as HTMLSelectElement)?.value;
            const req = currentUser?.username || 'Unknown User';

            if (dept === 'other') {
                dept = ($('#ticket-custom-department') as HTMLInputElement)?.value.trim();
                if (!dept) {
                    showToast('Please specify the custom department', 'error');
                    return;
                }
            }

            if (!title || !dept || !sev || !cat || !desc) {
                showToast('Please fill all required fields', 'error');
                return;
            }

            try {
                const btn = $('#submit-ticket-btn') as HTMLButtonElement;
                if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
                
                const ticket = await ticketsAPI.create({
                    title, description: desc, department: dept, severity: sev, category: cat, requester: req
                });
                
                const fileInput = $('#ticket-file') as HTMLInputElement;
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    await ticketsAPI.uploadAttachment(ticket.id, fileInput.files[0]);
                }
                
                showToast('Ticket created successfully!');
                closeTicketModal();

                if (currentUser?.role === 'admin') await loadAndRenderAdmin();
                else await loadAndRenderClient();

            } catch (err) {
                 showToast('Failed to create ticket', 'error');
            } finally {
                 const btn = $('#submit-ticket-btn') as HTMLButtonElement;
                 if (btn) { btn.disabled = false; btn.textContent = 'Submit Request'; }
            }
        });
    }

    // ==================== RATING MODAL ====================

    const ratingModal = $('#rating-modal');
    let ratingTicketId: string | null = null;
    let selectedRating = 0;

    function openRatingModal(ticket: Ticket) {
        if (!ratingModal) return;
        ratingTicketId = ticket.id;
        selectedRating = 0;
        
        const starsContainer = $('#rating-stars');
        if (starsContainer) {
            html(starsContainer, Array.from({ length: 5 }, (_, i) => `<button class="rating-star" data-val="${i + 1}">⭐</button>`).join(''));
            
            starsContainer.querySelectorAll('.rating-star').forEach(s => {
                s.addEventListener('click', function (this: HTMLElement) {
                    selectedRating = parseInt(this.dataset.val || '0');
                    starsContainer.querySelectorAll('.rating-star').forEach(btn => {
                        const val = parseInt((btn as HTMLElement).dataset.val || '0');
                        btn.classList.toggle('active', val <= selectedRating);
                    });
                });
            });
        }

        ($('#rating-comment') as HTMLTextAreaElement).value = '';
        ratingModal.classList.add('show');
    }

    function closeRatingModal() {
        if (ratingModal) ratingModal.classList.remove('show');
        ratingTicketId = null;
    }

    $$('#rating-modal .modal-close, #rating-cancel').forEach(b => b.addEventListener('click', closeRatingModal));

    const ratingSubmitBtn = $('#rating-submit');
    if (ratingSubmitBtn) {
        ratingSubmitBtn.addEventListener('click', async () => {
            if (!ratingTicketId) return;
            if (selectedRating === 0) {
                showToast('Please select a star rating', 'error');
                return;
            }

            const comment = ($('#rating-comment') as HTMLTextAreaElement)?.value.trim();

            try {
                const btn = $('#rating-submit') as HTMLButtonElement;
                if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
                
                await ticketsAPI.update(ratingTicketId, { rating: selectedRating, ratingComment: comment });
                showToast('Thank you for your feedback!');
                closeRatingModal();
                if (currentUser?.role === 'admin') await loadAndRenderAdmin();
                else await loadAndRenderClient();
            } catch (err) {
                showToast('Failed to submit rating', 'error');
            } finally {
                const btn = $('#rating-submit') as HTMLButtonElement;
                if (btn) { btn.disabled = false; btn.textContent = 'Submit Rating'; }
            }
        });
    }

    // ==================== KNOWLEDGE BASE ====================

    let articleModalMode: 'create' | 'edit' = 'create';
    const articleModal = $('#article-modal');
    
    function openArticleModal(article?: Article) {
        if (!articleModal) return;
        articleModalMode = article ? 'edit' : 'create';
        ($('#article-modal-title') as HTMLElement).textContent = article ? 'Edit Article' : 'Create Article';
        
        const idField = $('#article-id') as HTMLInputElement;
        const titleField = $('#article-title') as HTMLInputElement;
        const catField = $('#article-category') as HTMLInputElement;
        const contentField = $('#article-content') as HTMLTextAreaElement;
        
        if (article) {
            idField.value = article.id;
            titleField.value = article.title;
            catField.value = article.category;
            contentField.value = article.content;
        } else {
            idField.value = '';
            titleField.value = '';
            catField.value = '';
            contentField.value = '';
        }
        
        articleModal.classList.add('show');
    }
    
    function closeArticleModal() {
        if (articleModal) articleModal.classList.remove('show');
    }
    
    $('#close-article-modal-btn')?.addEventListener('click', closeArticleModal);
    $('#cancel-article-modal-btn')?.addEventListener('click', closeArticleModal);
    
    $('#article-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = ($('#article-id') as HTMLInputElement).value;
        const title = ($('#article-title') as HTMLInputElement).value.trim();
        const category = ($('#article-category') as HTMLInputElement).value.trim();
        const content = ($('#article-content') as HTMLTextAreaElement).value.trim();
        
        if (!title || !content) return;
        
        try {
            if (articleModalMode === 'edit') {
                await articlesAPI.update(id, { title, category, content });
                showToast('Article updated successfully');
            } else {
                await articlesAPI.create({ title, category, content, author: currentUser?.username || 'Admin' });
                showToast('Article created successfully');
            }
            closeArticleModal();
            if (adminView === 'knowledge-base') renderAdminView();
            else if (clientView === 'knowledge-base') renderClientView();
        } catch (err) {
            showToast('Failed to save article', 'error');
        }
    });

    async function fetchKnowledgeBase(search?: string) {
        try {
            allArticles = await articlesAPI.list(search);
        } catch (err) {
            showToast('Failed to load articles', 'error');
        }
    }

    async function renderAdminKnowledgeBase(container: HTMLElement) {
        await fetchKnowledgeBase();
        
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <div>
                    <p style="color:var(--text-muted);font-size:14px;margin:0">Manage support articles and FAQs</p>
                    <p style="color:var(--text-muted);font-size:11px;margin:4px 0 0;opacity:0.7">⠿ Drag rows to reorder</p>
                </div>
                <button class="btn btn-primary" id="btn-new-article">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Article
                </button>
            </div>
            <div class="table-wrap">
                <div class="table-head">
                    <span style="flex:0 0 36px"></span>
                    <span style="flex:1">Title</span>
                    <span style="flex:0 0 150px">Category</span>
                    <span style="flex:0 0 120px">Author</span>
                    <span style="flex:0 0 100px">Updated</span>
                    <span style="flex:0 0 100px;text-align:right">Actions</span>
                </div>
                <div id="kb-table-body"></div>
            </div>
        `;
        
        const body = $('#kb-table-body');
        if (allArticles.length === 0 && body) {
            body.innerHTML = '<div class="empty-state" style="padding:30px">No articles found.</div>';
        } else if (body) {
            let dragSrcId: string | null = null;

            allArticles.forEach(a => {
                const row = el('div', { className: 'table-row kb-drag-row', draggable: 'true', 'data-id': a.id });
                row.innerHTML = `
                    <span style="flex:0 0 36px;cursor:grab;color:var(--text-muted);font-size:16px;user-select:none;display:flex;align-items:center">⠿</span>
                    <span style="flex:1;font-weight:600;color:var(--text-heading);font-size:13px">${esc(a.title)}</span>
                    <span style="flex:0 0 150px"><span class="badge-cat">${esc(a.category)}</span></span>
                    <span style="flex:0 0 120px;color:var(--text-secondary);font-size:12px">${esc(a.author)}</span>
                    <span style="flex:0 0 100px;color:var(--text-muted);font-size:11px">${formatDate(a.updatedAt)}</span>
                    <span style="flex:0 0 100px;text-align:right">
                        <button class="btn-ghost edit-art-btn" style="padding:4px 8px;font-size:11px" data-id="${esc(a.id)}">Edit</button>
                        <button class="btn-ghost del-art-btn" style="padding:4px 8px;font-size:11px;color:var(--severity-severe)" data-id="${esc(a.id)}">Del</button>
                    </span>
                `;

                row.addEventListener('dragstart', (e: DragEvent) => {
                    dragSrcId = a.id;
                    row.classList.add('kb-dragging');
                    if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', a.id);
                    }
                });

                row.addEventListener('dragend', () => {
                    row.classList.remove('kb-dragging');
                    $$('.kb-drag-row').forEach(r => r.classList.remove('kb-drag-over'));
                    dragSrcId = null;
                });

                row.addEventListener('dragover', (e: DragEvent) => {
                    e.preventDefault();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                    if (dragSrcId && dragSrcId !== a.id) {
                        $$('.kb-drag-row').forEach(r => r.classList.remove('kb-drag-over'));
                        row.classList.add('kb-drag-over');
                    }
                });

                row.addEventListener('dragleave', () => {
                    row.classList.remove('kb-drag-over');
                });

                row.addEventListener('drop', async (e: DragEvent) => {
                    e.preventDefault();
                    row.classList.remove('kb-drag-over');
                    if (!dragSrcId || dragSrcId === a.id) return;

                    // Compute new order
                    const ids = allArticles.map(x => x.id);
                    const fromIdx = ids.indexOf(dragSrcId);
                    const toIdx = ids.indexOf(a.id);
                    if (fromIdx === -1 || toIdx === -1) return;

                    ids.splice(fromIdx, 1);
                    ids.splice(toIdx, 0, dragSrcId);

                    try {
                        await articlesAPI.reorder(ids);
                        showToast('Articles reordered');
                        await fetchKnowledgeBase();
                        renderAdminKnowledgeBase(container);
                    } catch (err) {
                        showToast('Failed to reorder', 'error');
                    }
                });

                body.appendChild(row);
            });
        }
        
        $('#btn-new-article')?.addEventListener('click', () => openArticleModal());
        
        $$('.edit-art-btn').forEach(b => {
            b.addEventListener('click', (e) => {
                const a = allArticles.find(x => x.id === (b as HTMLElement).dataset.id);
                if (a) openArticleModal(a);
            });
        });
        
        $$('.del-art-btn').forEach(b => {
            b.addEventListener('click', async (e) => {
                const id = (b as HTMLElement).dataset.id;
                if (!id || !confirm('Delete this article?')) return;
                try {
                    await articlesAPI.delete(id);
                    showToast('Article deleted');
                    renderAdminView();
                } catch (err) {
                    showToast('Failed to delete', 'error');
                }
            });
        });
    }

    let clientKbSearch = '';

    async function renderClientKnowledgeBase(container: HTMLElement) {
        await fetchKnowledgeBase(clientKbSearch);
        
        container.innerHTML = `
            <div style="margin-bottom:20px;display:flex;gap:15px;align-items:center;">
                <input type="text" id="kb-search-client" class="search-box" style="flex:1;max-width:400px;" placeholder="Search articles, FAQs..." value="${esc(clientKbSearch)}">
                <button class="btn btn-primary" id="kb-search-btn">Search</button>
            </div>
            <div id="kb-client-list" style="display:grid;gap:15px;grid-template-columns:1fr;align-items:start;">
            </div>
        `;
        
        const list = $('#kb-client-list');
        if (list) {
            if (allArticles.length === 0) {
                list.innerHTML = '<div class="empty-state">No matching articles found.</div>';
            } else {
                allArticles.forEach(a => {
                    const card = el('div', { className: 'panel', style: { padding: '20px' } });
                    card.innerHTML = `
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
                            <span class="badge-cat">${esc(a.category)}</span>
                            <span style="margin-left:10px">Updated ${formatDate(a.updatedAt)}</span>
                        </div>
                        <h3 style="color:var(--text-heading);margin:0 0 12px 0;">${esc(a.title)}</h3>
                        <div style="color:var(--text-secondary);font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(a.content)}</div>
                    `;
                    list.appendChild(card);
                });
            }
        }
        
        const searchInput = $('#kb-search-client') as HTMLInputElement;
        const searchBtn = $('#kb-search-btn') as HTMLButtonElement;
        
        const performSearch = () => {
            clientKbSearch = searchInput.value.trim();
            renderClientView();
        };
        
        searchBtn?.addEventListener('click', performSearch);
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    // ==================== THEME TOGGLE ====================

    const THEME_KEY = 'itsupport_theme';

    function getStoredTheme(): string {
        return localStorage.getItem(THEME_KEY) || 'dark';
    }

    function applyTheme(theme: string) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);

        // Update all toggle buttons
        $$('.theme-toggle').forEach(btn => {
            const icon = btn.querySelector('.theme-icon');
            const label = btn.querySelector('span:last-child');
            if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
            if (label) label.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';
        });
    }

    function toggleTheme() {
        const current = getStoredTheme();
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    // Wire up theme toggle
    $('#global-theme-toggle')?.addEventListener('click', toggleTheme);

    // ==================== MOBILE SIDEBAR TOGGLE ====================

    function setupSidebarToggle(toggleId: string, sidebarId: string, overlayId: string) {
        const toggle = $(`#${toggleId}`);
        const sidebar = $(`#${sidebarId}`);
        const overlay = $(`#${overlayId}`);

        if (!toggle || !sidebar) return;

        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay?.classList.toggle('show');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });

        // Close sidebar when a nav button is clicked (mobile)
        sidebar.querySelectorAll('.sb-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay?.classList.remove('show');
                }
            });
        });
    }

    setupSidebarToggle('client-sidebar-toggle', 'client-sidebar', 'client-sidebar-overlay');
    setupSidebarToggle('admin-sidebar-toggle', 'admin-sidebar', 'admin-sidebar-overlay');

    // ==================== APP INIT ====================

    function init() {
        // Apply saved theme
        applyTheme(getStoredTheme());

        const session = getSession();
        if (session) {
            currentUser = session;
            if (session.role === 'admin') enterAdmin();
            else enterClient();
        } else {
            showScreen(loginScreen);
        }

        // Auto-refresh data every 30s
        setInterval(() => {
            if (!currentUser) return;
            if (currentUser.role === 'admin') loadAndRenderAdmin();
            else loadAndRenderClient();
        }, 30000);
    }

    // Close modals on background click
    window.addEventListener('click', (e) => {
        if (e.target === createModal) closeTicketModal();
        if (e.target === ratingModal) closeRatingModal();
        if (e.target === articleModal) closeArticleModal();
    });

    init();

})();
