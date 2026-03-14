"use strict";
/* ===================================
   IT Support Ticketing System
   Application Logic — API-Driven
   =================================== */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function () {
    'use strict';
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // ==================== CONSTANTS ====================
    const DEPARTMENTS = [
        'Executive', 'Marketing', 'I-Wallet', 'Admin', 'I-Tech',
        'Joint Ventures', 'IT', 'Customer Care', 'Secretary',
        'Real Estate', 'Corporate'
    ];
    const AGENTS = ['Sean Khayle', 'CJ', 'Jeremiah', 'Clarence'];
    function getAssignees(ticket) {
        if (!ticket.assignee || ticket.assignee === 'Unassigned')
            return [];
        return ticket.assignee.split(',').map(a => a.trim()).filter(Boolean);
    }
    function formatAssignees(ticket) {
        const list = getAssignees(ticket);
        return list.length > 0 ? list.join(', ') : 'Unassigned';
    }
    const SESSION_KEY = 'itsupport_session';
    const API = '/api';
    // ==================== API LAYER ====================
    function api(path_1) {
        return __awaiter(this, arguments, void 0, function* (path, opts = {}) {
            const res = yield fetch(`${API}${path}`, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
            if (!res.ok) {
                const err = yield res.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(err.error || 'Request failed');
            }
            return res.json();
        });
    }
    const ticketsAPI = {
        list: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return api(`/tickets${qs ? '?' + qs : ''}`);
        },
        get: (id) => api(`/tickets/${id}`),
        create: (data) => api('/tickets', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => api(`/tickets/${id}`, { method: 'DELETE' }),
        addNote: (id, data) => api(`/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),
        uploadAttachment: (id, file) => __awaiter(this, void 0, void 0, function* () {
            const formData = new FormData();
            formData.append('file', file);
            const res = yield fetch(`${API}/tickets/${id}/attachments`, { method: 'POST', body: formData });
            if (!res.ok)
                throw new Error('Upload failed');
            return res.json();
        }),
        stats: () => api('/stats'),
    };
    const articlesAPI = {
        list: (search) => {
            const qs = search ? `?search=${encodeURIComponent(search)}` : '';
            return api(`/articles${qs}`);
        },
        create: (data) => api('/articles', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => api(`/articles/${id}`, { method: 'DELETE' }),
    };
    // ==================== SESSION ====================
    function getSession() {
        try {
            const s = sessionStorage.getItem(SESSION_KEY);
            return s ? JSON.parse(s) : null;
        }
        catch (_a) {
            return null;
        }
    }
    function setSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
    function clearSession() { sessionStorage.removeItem(SESSION_KEY); }
    // ==================== DOM HELPERS ====================
    const $ = (s, p) => (p || document).querySelector(s);
    const $$ = (s, p) => (p || document).querySelectorAll(s);
    function el(tag, attrs = {}, children = []) {
        const e = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'style' && typeof v === 'object')
                Object.assign(e.style, v);
            else if (k === 'className')
                e.className = v;
            else if (k.startsWith('on') && typeof v === 'function') {
                e.addEventListener(k.slice(2).toLowerCase(), v);
            }
            else
                e.setAttribute(k, String(v));
        }
        for (const c of children) {
            if (typeof c === 'string')
                e.appendChild(document.createTextNode(c));
            else if (c instanceof Node)
                e.appendChild(c);
        }
        return e;
    }
    function html(container, htmlStr) {
        container.innerHTML = htmlStr;
    }
    // ==================== FORMATTERS ====================
    function formatDate(iso) {
        if (!iso)
            return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    }
    function formatDateTime(iso) {
        if (!iso)
            return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }
    function statusClass(s) {
        const map = { 'Open': 'open', 'In Progress': 'in-progress', 'Resolved': 'resolved', 'Closed': 'closed' };
        return 'badge badge-' + (map[s] || 'open');
    }
    function severityClass(s) {
        return 'badge badge-' + (s || 'moderate').toLowerCase();
    }
    function getSLAHtml(ticket) {
        if (ticket.status === 'Resolved' || ticket.status === 'Closed')
            return '';
        if (!ticket.dueAt)
            return '';
        const diff = Date.parse(ticket.dueAt) - Date.now();
        if (diff < 0)
            return `<span class="badge-sla breached">SLA Breached</span>`;
        if (diff < 3600000 * 2)
            return `<span class="badge-sla risk">SLA At Risk</span>`;
        return '';
    }
    function getSeverityColor(s) {
        if (s === 'Severe')
            return 'var(--severity-severe)';
        if (s === 'High')
            return 'var(--severity-high)';
        if (s === 'Moderate')
            return 'var(--severity-moderate)';
        return 'var(--severity-low)';
    }
    function starsHTML(n, small) {
        let h = `<span class="stars${small ? ' stars-sm' : ''}">`;
        for (let i = 1; i <= 5; i++)
            h += `<span class="star${i <= n ? '' : ' off'}">⭐</span>`;
        return h + '</span>';
    }
    function isResolved(t) {
        return t.status === 'Resolved' || t.status === 'Closed';
    }
    // ==================== AUDIO ====================
    let audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx)
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    }
    function playNewTicketSound() {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.45);
        }
        catch (e) { }
    }
    function playCriticalSound() {
        try {
            const ctx = getAudioCtx();
            const t = ctx.currentTime;
            [0, 0.22, 0.44].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, t + offset);
                osc.frequency.setValueAtTime(550, t + offset + 0.08);
                gain.gain.setValueAtTime(0, t + offset);
                gain.gain.linearRampToValueAtTime(0.10, t + offset + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);
                osc.start(t + offset);
                osc.stop(t + offset + 0.20);
            });
        }
        catch (e) { }
    }
    // ==================== TOAST ====================
    const toastContainer = $('#toast-container');
    function showToast(message, type = 'success') {
        if (!toastContainer)
            return;
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
    function showNotifBanner(message, type, ticketId) {
        if (!toastContainer)
            return;
        const banner = el('div', { className: `notif-banner notif-${type}` });
        banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;cursor:pointer" id="banner-${ticketId || 'x'}">
                <div class="notif-pulse"></div>
                ${esc(message)}
            </div>
            <button class="notif-close">✕</button>
        `;
        toastContainer.appendChild(banner);
        const closeBtn = banner.querySelector('.notif-close');
        if (closeBtn)
            closeBtn.addEventListener('click', () => banner.remove());
        if (ticketId) {
            const bClick = banner.querySelector(`#banner-${ticketId}`);
            if (bClick)
                bClick.addEventListener('click', () => {
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
    function showScreen(screen) {
        if (!screen)
            return;
        $$('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }
    // ==================== STATE ====================
    let currentUser = null;
    let allTickets = [];
    let allArticles = [];
    let prevTicketCount = 0;
    let adminView = 'dashboard';
    let clientView = 'my-tickets';
    let selectedTicketId = null;
    let ratingPromptShown = false;
    // ==================== AUTH ====================
    const loginForm = $('#login-form');
    const passwordGroup = $('#password-group');
    const loginRole = $('#login-role');
    if (loginRole && passwordGroup) {
        loginRole.addEventListener('change', function () {
            var _a, _b;
            const usernameGroup = $('#username-group');
            if (this.value === 'admin') {
                passwordGroup.style.display = '';
                (_a = $('#login-password')) === null || _a === void 0 ? void 0 : _a.setAttribute('required', 'true');
                if (usernameGroup) usernameGroup.style.display = 'none';
                const u = $('#login-username');
                if (u) { u.removeAttribute('required'); u.value = ''; }
            }
            else {
                passwordGroup.style.display = 'none';
                (_b = $('#login-password')) === null || _b === void 0 ? void 0 : _b.removeAttribute('required');
                const p = $('#login-password');
                if (p)
                    p.value = '';
                if (usernameGroup) usernameGroup.style.display = '';
                const u = $('#login-username');
                if (u) u.setAttribute('required', 'true');
            }
        });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const usernameInput = $('#login-username');
            const roleInput = $('#login-role');
            const passInput = $('#login-password');
            const role = roleInput === null || roleInput === void 0 ? void 0 : roleInput.value;
            let username;
            if (role === 'admin') {
                const password = passInput === null || passInput === void 0 ? void 0 : passInput.value.trim();
                if (!password) {
                    showToast('Password is required for admin login', 'error');
                    return;
                }
                if (password !== '@inspireSupport') {
                    showToast('Incorrect admin password', 'error');
                    return;
                }
                username = 'Admin';
            } else {
                username = usernameInput === null || usernameInput === void 0 ? void 0 : usernameInput.value.trim();
                if (!username) {
                    showToast('Please enter your name', 'error');
                    return;
                }
            }
            currentUser = { username, role };
            setSession(currentUser);
            if (role === 'admin')
                enterAdmin();
            else
                enterClient();
            loginForm.reset();
            if (passwordGroup)
                passwordGroup.style.display = 'none';
            const usernameGroup = $('#username-group');
            if (usernameGroup) usernameGroup.style.display = '';
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
    (_a = $('#client-logout-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', logout);
    (_b = $('#admin-logout-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', logout);
    // ==================== ENTER CLIENT ====================
    function enterClient() {
        return __awaiter(this, void 0, void 0, function* () {
            currentUser = getSession();
            if (!currentUser)
                return;
            const sn = $('#client-sidebar-name');
            if (sn)
                sn.textContent = currentUser.username;
            showScreen(clientScreen);
            clientView = 'my-tickets';
            yield loadAndRenderClient();
        });
    }
    function loadAndRenderClient() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                allTickets = yield ticketsAPI.list();
            }
            catch (err) {
                showToast('Failed to load tickets', 'error');
                return;
            }
            renderClientView();
        });
    }
    function renderClientView() {
        var _a;
        if (!currentUser)
            return;
        const mine = allTickets.filter(t => t.requester === currentUser.username);
        const setStat = (id, val) => { const e = $(`#${id}`); if (e)
            e.textContent = String(val); };
        setStat('cs-open', mine.filter(t => t.status === 'Open').length);
        setStat('cs-active', mine.filter(t => t.status === 'In Progress').length);
        setStat('cs-resolved', mine.filter(t => isResolved(t)).length);
        const toRate = mine.filter(t => isResolved(t) && t.rating === null).length;
        const rateBadge = $('#client-to-rate-badge');
        if (rateBadge) {
            if (toRate > 0) {
                rateBadge.style.display = '';
                rateBadge.textContent = `${toRate} to rate`;
            }
            else {
                rateBadge.style.display = 'none';
            }
        }
        const content = $('#client-content');
        const titleEl = $('#client-page-title');
        if (!content || !titleEl)
            return;
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
                (_a = $('#empty-submit-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => openTicketModal());
            }
            else {
                renderClientList(content, mine);
                if (!ratingPromptShown) {
                    const unrated = mine.find(t => isResolved(t) && t.rating === null);
                    if (unrated) {
                        ratingPromptShown = true;
                        setTimeout(() => openRatingModal(unrated), 400);
                    }
                }
            }
        }
        else if (clientView === 'detail' && selectedTicketId) {
            titleEl.textContent = 'Ticket Detail';
            const ticket = allTickets.find(t => t.id === selectedTicketId);
            if (ticket) {
                renderClientDetail(content, ticket);
                if (!ratingPromptShown && isResolved(ticket) && ticket.rating === null) {
                    ratingPromptShown = true;
                    setTimeout(() => openRatingModal(ticket), 400);
                }
            }
            else {
                clientView = 'my-tickets';
                renderClientView();
            }
        }
        else if (clientView === 'knowledge-base') {
            titleEl.textContent = 'Knowledge Base';
            renderClientKnowledgeBase(content);
        }
    }
    function renderClientList(container, tickets) {
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
                        <div style="font-weight:600;font-size:15px;color:#eee;margin-bottom:4px">${esc(t.title)}${getSLAHtml(t)}</div>
                        <div style="font-size:12px;color:#666">${esc(t.category)} · ${formatAssignees(t)} · ${formatDate(t.updatedAt)}</div>
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
                if (e.target.classList.contains('rate-btn'))
                    return;
                selectedTicketId = t.id;
                clientView = 'detail';
                renderClientView();
            });
            container.appendChild(card);
        });
        container.querySelectorAll('.rate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ticket = allTickets.find(t => t.id === btn.dataset.id);
                if (ticket)
                    openRatingModal(ticket);
            });
        });
    }
    function renderClientDetail(container, ticket) {
        var _a;
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
                        <p style="color:#aaa;line-height:1.75;margin:0;font-size:14px;white-space:pre-wrap">${esc(ticket.description)}</p>
                        ${(ticket.attachments && ticket.attachments.length > 0) ? `
                            <div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border)">
                                <strong style="color:#ddd;font-size:13px;display:block;margin-bottom:8px">Attachments</strong>
                                <div style="display:flex;gap:10px;flex-wrap:wrap">
                                    ${ticket.attachments.map((a) => `
                                        <a href="/uploads/${a.filename}" target="_blank" class="attachment-link">
                                            📎 ${esc(a.originalname)} <span style="opacity:0.6;font-size:10px">(${(a.size / 1024).toFixed(1)}kb)</span>
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    ${notes.length > 0 ? `
                    <div class="panel">
                        <div class="panel-header" style="color:var(--status-progress)">💬 IT Support Updates</div>
                        ${notes.map(n => `
                            <div class="note-item">
                                <span class="note-author">${esc(n.author)}<span class="note-time">${esc(n.time)}</span></span>
                                <div class="note-text">${esc(n.text)}</div>
                            </div>
                        `).join('')}
                    </div>` : ''}
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
                            <p style="color:#888;font-size:13px;margin:0 0 12px">This ticket has been resolved. How was our support?</p>
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
        (_a = $('#client-back-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
            clientView = 'my-tickets';
            selectedTicketId = null;
            renderClientView();
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
    function enterAdmin() {
        return __awaiter(this, void 0, void 0, function* () {
            currentUser = getSession();
            showScreen(adminScreen);
            adminView = 'dashboard';
            updateAdminNav();
            yield loadAndRenderAdmin();
        });
    }
    function loadAndRenderAdmin() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                allTickets = yield ticketsAPI.list();
            }
            catch (err) {
                showToast('Failed to load tickets', 'error');
                return;
            }
            if (prevTicketCount > 0 && allTickets.length > prevTicketCount) {
                const newest = allTickets[0];
                if (newest.severity === 'Severe') {
                    playCriticalSound();
                    showNotifBanner(`🔥 SEVERE TICKET: ${newest.title}`, 'critical', newest.id);
                }
                else {
                    playNewTicketSound();
                    showNotifBanner(`🎫 New ticket received: ${newest.title}`, 'new', newest.id);
                }
            }
            prevTicketCount = allTickets.length;
            updateAdminSidebar();
            renderAdminView();
        });
    }
    function updateAdminSidebar() {
        const open = allTickets.filter(t => t.status === 'Open').length;
        const inProg = allTickets.filter(t => t.status === 'In Progress').length;
        const severe = allTickets.filter(t => t.severity === 'Severe' && !isResolved(t)).length;
        const resolved = allTickets.filter(t => isResolved(t)).length;
        const rated = allTickets.filter(t => t.rating !== null);
        const avg = rated.length ? (rated.reduce((s, t) => s + t.rating, 0) / rated.length).toFixed(1) : '—';
        const setStat = (id, val) => { const e = $(`#${id}`); if (e)
            e.textContent = String(val); };
        setStat('as-open', open);
        setStat('as-progress', inProg);
        setStat('as-severe', severe);
        setStat('as-resolved', resolved);
        setStat('as-rating', avg + (avg !== '—' ? '★' : ''));
        const badge = $('#admin-open-badge');
        if (badge) {
            if (open > 0) {
                badge.style.display = '';
                badge.textContent = String(open);
            }
            else
                badge.style.display = 'none';
        }
    }
    function updateAdminNav() {
        $$('#admin-sidebar .sb-nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === adminView || (adminView === 'detail' && b.dataset.view === 'all-tickets'));
        });
        const filters = $('#admin-filters');
        if (filters)
            filters.style.display = (adminView === 'all-tickets' || adminView === 'detail') ? '' : 'none';
    }
    function renderAdminView() {
        const content = $('#admin-content');
        const titleEl = $('#admin-page-title');
        if (!content || !titleEl)
            return;
        updateAdminNav();
        if (adminView === 'dashboard') {
            titleEl.textContent = 'Dashboard';
            renderAdminDashboard(content);
        }
        else if (adminView === 'all-tickets') {
            titleEl.textContent = 'All Tickets';
            renderAdminTicketTable(content, getFilteredTickets());
        }
        else if (adminView === 'resolved') {
            titleEl.textContent = 'Resolved & Ratings';
            renderResolvedView(content);
        }
        else if (adminView === 'detail' && selectedTicketId) {
            titleEl.textContent = 'Ticket Detail';
            const ticket = allTickets.find(t => t.id === selectedTicketId);
            if (ticket)
                renderAdminDetail(content, ticket);
            else {
                adminView = 'all-tickets';
                renderAdminView();
            }
        }
        else if (adminView === 'knowledge-base') {
            titleEl.textContent = 'Knowledge Base';
            renderAdminKnowledgeBase(content);
        }
    }
    function getFilteredTickets() {
        var _a, _b, _c, _d;
        const status = ((_a = $('#admin-filter-status')) === null || _a === void 0 ? void 0 : _a.value) || 'all';
        const severity = ((_b = $('#admin-filter-severity')) === null || _b === void 0 ? void 0 : _b.value) || 'all';
        const dept = ((_c = $('#admin-filter-dept')) === null || _c === void 0 ? void 0 : _c.value) || 'all';
        const search = ((_d = $('#admin-search')) === null || _d === void 0 ? void 0 : _d.value) || '';
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
        if (el)
            el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
                if (adminView === 'all-tickets')
                    renderAdminView();
            });
    });
    function renderAdminDashboard(container) {
        var _a, _b;
        const total = allTickets.length;
        const open = allTickets.filter(t => t.status === 'Open').length;
        const inProg = allTickets.filter(t => t.status === 'In Progress').length;
        const severe = allTickets.filter(t => t.severity === 'Severe' && !isResolved(t)).length;
        const rated = allTickets.filter(t => t.rating !== null);
        const avg = rated.length ? (rated.reduce((s, t) => s + t.rating, 0) / rated.length).toFixed(1) : '—';
        const severeTickets = allTickets.filter(t => t.severity === 'Severe' && !isResolved(t));
        const recent = [...allTickets].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 5);
        const byDept = DEPARTMENTS.map(d => ({ d, n: allTickets.filter(t => t.department === d && !isResolved(t)).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
        const topRated = [...allTickets].filter(t => t.rating !== null).sort((a, b) => b.rating - a.rating).slice(0, 3);
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
            }
            else {
                severeTickets.forEach(t => severeList.appendChild(miniCard(t, false)));
            }
        }
        const recentList = $('#dash-recent-list');
        if (recentList)
            recent.forEach(t => recentList.appendChild(miniCard(t, true)));
        const deptChart = $('#dash-dept-chart');
        if (deptChart) {
            if (byDept.length === 0) {
                deptChart.innerHTML = '<div class="empty-state" style="padding:18px 0">No active tickets</div>';
            }
            else {
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
            }
            else {
                topRated.forEach(t => {
                    const row = el('div', { style: { padding: '8px 0', borderBottom: '1px solid rgba(26,26,32,0.6)' } });
                    row.innerHTML = `
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:12px;color:#ccc;font-weight:600">${esc(t.title.slice(0, 36))}${t.title.length > 36 ? '…' : ''}</span>
                            ${starsHTML(t.rating, true)}
                        </div>
                        ${t.ratingComment ? `<div style="font-size:11px;color:#666;margin-top:2px;font-style:italic">"${esc(t.ratingComment)}"</div>` : ''}
                    `;
                    ratingsList.appendChild(row);
                });
            }
        }
        (_a = $('#dash-view-all')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => { adminView = 'all-tickets'; renderAdminView(); });
        (_b = $('#dash-view-resolved')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => { adminView = 'resolved'; renderAdminView(); });
    }
    function miniCard(ticket, compact) {
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
    function renderAdminTicketTable(container, tickets) {
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
        if (!body)
            return;
        if (tickets.length === 0) {
            body.innerHTML = '<div class="empty-state" style="padding:30px">No tickets found.</div>';
            return;
        }
        tickets.forEach(t => {
            const row = el('div', { className: 'table-row' });
            row.innerHTML = `
                <span style="flex:0 0 88px;font-family:monospace;font-size:10px;color:var(--text-muted)">${esc(t.id)}</span>
                <span style="flex:1;font-weight:600;color:#eee;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}${getSLAHtml(t)}</span>
                <span style="flex:0 0 110px"><span class="badge-dept">${esc(t.department)}</span></span>
                <span style="flex:0 0 86px"><span class="${severityClass(t.severity)}">${esc(t.severity)}</span></span>
                <span style="flex:0 0 108px"><span class="${statusClass(t.status)}">${esc(t.status)}</span></span>
                <span style="flex:0 0 100px;color:#777;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.requester)}</span>
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
    function renderResolvedView(container) {
        const resolved = allTickets.filter(t => isResolved(t));
        const rated = resolved.filter(t => t.rating !== null);
        const avg = rated.length ? (rated.reduce((s, t) => s + t.rating, 0) / rated.length).toFixed(1) : null;
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
        if (!body)
            return;
        if (resolved.length === 0) {
            body.innerHTML = '<div class="empty-state" style="padding:40px 0">No resolved tickets yet</div>';
            return;
        }
        resolved.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).forEach(t => {
            const row = el('div', { className: 'table-row' });
            row.innerHTML = `
                <span style="flex:0 0 88px;font-family:monospace;font-size:10px;color:var(--text-muted)">${esc(t.id)}</span>
                <span style="flex:1;font-weight:600;color:#eee;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span>
                <span style="flex:0 0 100px;color:#999;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.requester)}</span>
                <span style="flex:0 0 100px">${t.rating != null ? starsHTML(t.rating, true) : '<span style="color:#555;font-size:12px;font-style:italic">Unrated</span>'}</span>
                <span style="flex:1;color:#aaa;font-size:12px;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.ratingComment ? '"' + esc(t.ratingComment) + '"' : ''}</span>
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
    function renderAdminDetail(container, ticket) {
        var _a, _b, _c, _d;
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
                <div style="display:flex;gap:10px">
                    <button class="btn btn-primary" id="admin-update-btn">Update Status/Assignee</button>
                    <button class="btn-back" id="admin-back-btn">← Back</button>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-main">
                    <div class="panel">
                        <div class="panel-header">Issue Details</div>
                        <p style="color:#aaa;line-height:1.75;margin:0;font-size:14px;white-space:pre-wrap">${esc(ticket.description)}</p>
                        ${(ticket.attachments && ticket.attachments.length > 0) ? `
                            <div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border)">
                                <strong style="color:#ddd;font-size:13px;display:block;margin-bottom:8px">Attachments</strong>
                                <div style="display:flex;gap:10px;flex-wrap:wrap">
                                    ${ticket.attachments.map((a) => `
                                        <a href="/uploads/${a.filename}" target="_blank" class="attachment-link">
                                            📎 ${esc(a.originalname)} <span style="opacity:0.6;font-size:10px">(${(a.size / 1024).toFixed(1)}kb)</span>
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="panel" style="background:#131318">
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
                            <textarea id="reply-text" placeholder="Type a message or internal note..." style="width:100%;background:#1a1a20;border:1px solid #333;color:#eee;padding:12px;border-radius:6px;min-height:80px;font-family:inherit;margin-bottom:10px"></textarea>
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <input type="file" id="reply-file" style="font-size:12px;color:#aaa">
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
                    </div>

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
        (_a = $('#admin-back-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
            adminView = 'all-tickets';
            selectedTicketId = null;
            renderAdminView();
        });
        (_b = $('#btn-reply')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const txt = (_a = $('#reply-text')) === null || _a === void 0 ? void 0 : _a.value.trim();
            const fileInput = $('#reply-file');
            const file = (_b = fileInput === null || fileInput === void 0 ? void 0 : fileInput.files) === null || _b === void 0 ? void 0 : _b[0];
            if (!txt && !file)
                return;
            try {
                const btn = $('#btn-reply');
                if (btn)
                    btn.disabled = true;
                if (txt) {
                    yield ticketsAPI.addNote(ticket.id, { text: txt, author: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.username) || 'Admin' });
                }
                if (file) {
                    yield ticketsAPI.uploadAttachment(ticket.id, file);
                }
                showToast('Reply / Update added');
                yield loadAndRenderAdmin();
            }
            catch (err) {
                showToast('Failed to add reply', 'error');
                const btn = $('#btn-reply');
                if (btn)
                    btn.disabled = false;
            }
        }));
        (_c = $('#admin-update-btn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const stat = (_a = $('#dt-status')) === null || _a === void 0 ? void 0 : _a.value;
            const sev = (_b = $('#dt-severity')) === null || _b === void 0 ? void 0 : _b.value;
            const pri = (_c = $('#dt-priority')) === null || _c === void 0 ? void 0 : _c.value;
            const checkboxes = Array.from($$('.dt-assignee-cb'));
            const assigns = checkboxes.filter(cb => cb.checked).map(cb => cb.value).join(', ');
            try {
                const btn = $('#admin-update-btn');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Updating...';
                }
                // Add internal note about change if status changed
                if (stat !== ticket.status) {
                    yield ticketsAPI.addNote(ticket.id, {
                        text: `Status changed from "${ticket.status}" to "${stat}"`,
                        author: 'System'
                    });
                }
                yield ticketsAPI.update(ticket.id, {
                    status: stat,
                    severity: sev,
                    priority: pri,
                    assignee: assigns || 'Unassigned'
                });
                showToast('Ticket updated successfully');
                yield loadAndRenderAdmin();
            }
            catch (err) {
                showToast('Failed to update ticket', 'error');
                const btn = $('#admin-update-btn');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Update Status/Assignee';
                }
            }
        }));
        (_d = $('#admin-delete-btn')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            if (!confirm(`Delete ticket ${ticket.id}? This cannot be undone.`))
                return;
            try {
                const btn = $('#admin-delete-btn');
                if (btn)
                    btn.disabled = true;
                yield ticketsAPI.delete(ticket.id);
                showToast('Ticket deleted');
                adminView = 'all-tickets';
                selectedTicketId = null;
                yield loadAndRenderAdmin();
            }
            catch (err) {
                showToast('Failed to delete ticket', 'error');
                const btn = $('#admin-delete-btn');
                if (btn)
                    btn.disabled = false;
            }
        }));
    }
    // ==================== NEW TICKET MODAL ====================
    const createModal = $('#ticket-modal');
    function openTicketModal() {
        var _a;
        if (!createModal)
            return;
        createModal.classList.add('show');
        const dSel = $('#ticket-department');
        if (dSel)
            html(dSel, `<option value="" disabled selected>Select Department</option>${DEPARTMENTS.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}<option value="other">Other...</option>`);
        (_a = $('#ticket-title')) === null || _a === void 0 ? void 0 : _a.focus();
    }
    function closeTicketModal() {
        var _a;
        if (!createModal)
            return;
        createModal.classList.remove('show');
        (_a = $('#ticket-form')) === null || _a === void 0 ? void 0 : _a.reset();
        const cg = $('#custom-dept-group');
        if (cg)
            cg.style.display = 'none';
    }
    (_c = $('#client-new-ticket-btn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', openTicketModal);
    (_d = $('#admin-new-ticket-btn')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', openTicketModal);
    $$('#close-modal-btn, #cancel-modal-btn').forEach(b => b.addEventListener('click', closeTicketModal));
    const createDept = $('#ticket-department');
    const createCustomGroup = $('#custom-dept-group');
    const createCustomDept = $('#ticket-custom-department');
    if (createDept && createCustomGroup && createCustomDept) {
        createDept.addEventListener('change', function () {
            if (this.value === 'other') {
                createCustomGroup.style.display = '';
                createCustomDept.setAttribute('required', 'true');
            }
            else {
                createCustomGroup.style.display = 'none';
                createCustomDept.removeAttribute('required');
                createCustomDept.value = '';
            }
        });
    }
    const createForm = $('#ticket-form');
    if (createForm) {
        createForm.addEventListener('submit', (e) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            e.preventDefault();
            const title = (_a = $('#ticket-title')) === null || _a === void 0 ? void 0 : _a.value.trim();
            const desc = (_b = $('#ticket-description')) === null || _b === void 0 ? void 0 : _b.value.trim();
            let dept = (_c = $('#ticket-department')) === null || _c === void 0 ? void 0 : _c.value;
            const sev = (_d = $('#ticket-severity')) === null || _d === void 0 ? void 0 : _d.value;
            const cat = (_e = $('#ticket-category')) === null || _e === void 0 ? void 0 : _e.value;
            const req = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.username) || 'Unknown User';
            if (dept === 'other') {
                dept = (_f = $('#ticket-custom-department')) === null || _f === void 0 ? void 0 : _f.value.trim();
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
                const btn = $('#submit-ticket-btn');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Submitting...';
                }
                const ticket = yield ticketsAPI.create({
                    title, description: desc, department: dept, severity: sev, category: cat, requester: req
                });
                const fileInput = $('#ticket-file');
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    yield ticketsAPI.uploadAttachment(ticket.id, fileInput.files[0]);
                }
                showToast('Ticket created successfully!');
                closeTicketModal();
                if ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === 'admin')
                    yield loadAndRenderAdmin();
                else
                    yield loadAndRenderClient();
            }
            catch (err) {
                showToast('Failed to create ticket', 'error');
            }
            finally {
                const btn = $('#submit-ticket-btn');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Submit Request';
                }
            }
        }));
    }
    // ==================== RATING MODAL ====================
    const ratingModal = $('#rating-modal');
    let ratingTicketId = null;
    let selectedRating = 0;
    function openRatingModal(ticket) {
        if (!ratingModal)
            return;
        ratingTicketId = ticket.id;
        selectedRating = 0;
        const starsContainer = $('#rating-stars');
        if (starsContainer) {
            html(starsContainer, Array.from({ length: 5 }, (_, i) => `<button class="rating-star" data-val="${i + 1}">⭐</button>`).join(''));
            starsContainer.querySelectorAll('.rating-star').forEach(s => {
                s.addEventListener('click', function () {
                    selectedRating = parseInt(this.dataset.val || '0');
                    starsContainer.querySelectorAll('.rating-star').forEach(btn => {
                        const val = parseInt(btn.dataset.val || '0');
                        btn.classList.toggle('active', val <= selectedRating);
                    });
                });
            });
        }
        $('#rating-comment').value = '';
        ratingModal.classList.add('show');
    }
    function closeRatingModal() {
        if (ratingModal)
            ratingModal.classList.remove('show');
        ratingTicketId = null;
    }
    $$('#rating-modal .modal-close, #rating-cancel').forEach(b => b.addEventListener('click', closeRatingModal));
    const ratingSubmitBtn = $('#rating-submit');
    if (ratingSubmitBtn) {
        ratingSubmitBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!ratingTicketId)
                return;
            if (selectedRating === 0) {
                showToast('Please select a star rating', 'error');
                return;
            }
            const comment = (_a = $('#rating-comment')) === null || _a === void 0 ? void 0 : _a.value.trim();
            try {
                const btn = $('#rating-submit');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Submitting...';
                }
                yield ticketsAPI.update(ratingTicketId, { rating: selectedRating, ratingComment: comment });
                showToast('Thank you for your feedback!');
                closeRatingModal();
                if ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === 'admin')
                    yield loadAndRenderAdmin();
                else
                    yield loadAndRenderClient();
            }
            catch (err) {
                showToast('Failed to submit rating', 'error');
            }
            finally {
                const btn = $('#rating-submit');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Submit Rating';
                }
            }
        }));
    }
    // ==================== KNOWLEDGE BASE ====================
    let articleModalMode = 'create';
    const articleModal = $('#article-modal');
    function openArticleModal(article) {
        if (!articleModal)
            return;
        articleModalMode = article ? 'edit' : 'create';
        $('#article-modal-title').textContent = article ? 'Edit Article' : 'Create Article';
        const idField = $('#article-id');
        const titleField = $('#article-title');
        const catField = $('#article-category');
        const contentField = $('#article-content');
        if (article) {
            idField.value = article.id;
            titleField.value = article.title;
            catField.value = article.category;
            contentField.value = article.content;
        }
        else {
            idField.value = '';
            titleField.value = '';
            catField.value = '';
            contentField.value = '';
        }
        articleModal.classList.add('show');
    }
    function closeArticleModal() {
        if (articleModal)
            articleModal.classList.remove('show');
    }
    (_e = $('#close-article-modal-btn')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', closeArticleModal);
    (_f = $('#cancel-article-modal-btn')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', closeArticleModal);
    (_g = $('#article-form')) === null || _g === void 0 ? void 0 : _g.addEventListener('submit', (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const id = $('#article-id').value;
        const title = $('#article-title').value.trim();
        const category = $('#article-category').value.trim();
        const content = $('#article-content').value.trim();
        if (!title || !content)
            return;
        try {
            if (articleModalMode === 'edit') {
                yield articlesAPI.update(id, { title, category, content });
                showToast('Article updated successfully');
            }
            else {
                yield articlesAPI.create({ title, category, content, author: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.username) || 'Admin' });
                showToast('Article created successfully');
            }
            closeArticleModal();
            if (adminView === 'knowledge-base')
                renderAdminView();
            else if (clientView === 'knowledge-base')
                renderClientView();
        }
        catch (err) {
            showToast('Failed to save article', 'error');
        }
    }));
    function fetchKnowledgeBase(search) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                allArticles = yield articlesAPI.list(search);
            }
            catch (err) {
                showToast('Failed to load articles', 'error');
            }
        });
    }
    function renderAdminKnowledgeBase(container) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield fetchKnowledgeBase();
            container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <p style="color:var(--text-muted);font-size:14px;margin:0">Manage support articles and FAQs</p>
                <button class="btn btn-primary" id="btn-new-article">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Article
                </button>
            </div>
            <div class="table-wrap">
                <div class="table-head">
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
            }
            else if (body) {
                allArticles.forEach(a => {
                    const row = el('div', { className: 'table-row' });
                    row.innerHTML = `
                    <span style="flex:1;font-weight:600;color:#eee;font-size:13px">${esc(a.title)}</span>
                    <span style="flex:0 0 150px"><span class="badge-cat">${esc(a.category)}</span></span>
                    <span style="flex:0 0 120px;color:#aaa;font-size:12px">${esc(a.author)}</span>
                    <span style="flex:0 0 100px;color:var(--text-muted);font-size:11px">${formatDate(a.updatedAt)}</span>
                    <span style="flex:0 0 100px;text-align:right">
                        <button class="btn-ghost edit-art-btn" style="padding:4px 8px;font-size:11px" data-id="${esc(a.id)}">Edit</button>
                        <button class="btn-ghost del-art-btn" style="padding:4px 8px;font-size:11px;color:var(--severity-severe)" data-id="${esc(a.id)}">Del</button>
                    </span>
                `;
                    body.appendChild(row);
                });
            }
            (_a = $('#btn-new-article')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => openArticleModal());
            $$('.edit-art-btn').forEach(b => {
                b.addEventListener('click', (e) => {
                    const a = allArticles.find(x => x.id === b.dataset.id);
                    if (a)
                        openArticleModal(a);
                });
            });
            $$('.del-art-btn').forEach(b => {
                b.addEventListener('click', (e) => __awaiter(this, void 0, void 0, function* () {
                    const id = b.dataset.id;
                    if (!id || !confirm('Delete this article?'))
                        return;
                    try {
                        yield articlesAPI.delete(id);
                        showToast('Article deleted');
                        renderAdminView();
                    }
                    catch (err) {
                        showToast('Failed to delete', 'error');
                    }
                }));
            });
        });
    }
    let clientKbSearch = '';
    function renderClientKnowledgeBase(container) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fetchKnowledgeBase(clientKbSearch);
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
                }
                else {
                    allArticles.forEach(a => {
                        const card = el('div', { className: 'panel', style: { padding: '20px' } });
                        card.innerHTML = `
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
                            <span class="badge-cat">${esc(a.category)}</span>
                            <span style="margin-left:10px">Updated ${formatDate(a.updatedAt)}</span>
                        </div>
                        <h3 style="color:#eee;margin:0 0 12px 0;">${esc(a.title)}</h3>
                        <div style="color:#bbb;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(a.content)}</div>
                    `;
                        list.appendChild(card);
                    });
                }
            }
            const searchInput = $('#kb-search-client');
            const searchBtn = $('#kb-search-btn');
            const performSearch = () => {
                clientKbSearch = searchInput.value.trim();
                renderClientView();
            };
            searchBtn === null || searchBtn === void 0 ? void 0 : searchBtn.addEventListener('click', performSearch);
            searchInput === null || searchInput === void 0 ? void 0 : searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter')
                    performSearch();
            });
        });
    }
    // ==================== THEME TOGGLE ====================
    const THEME_KEY = 'itsupport_theme';
    function getStoredTheme() {
        return localStorage.getItem(THEME_KEY) || 'dark';
    }
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        // Update all toggle buttons
        $$('.theme-toggle').forEach(btn => {
            const icon = btn.querySelector('.theme-icon');
            const label = btn.querySelector('span:last-child');
            if (icon)
                icon.textContent = theme === 'light' ? '☀️' : '🌙';
            if (label)
                label.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';
        });
    }
    function toggleTheme() {
        const current = getStoredTheme();
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }
    // Wire up theme toggle
    (_h = $('#global-theme-toggle')) === null || _h === void 0 ? void 0 : _h.addEventListener('click', toggleTheme);
    // ==================== MOBILE SIDEBAR TOGGLE ====================
    function setupSidebarToggle(toggleId, sidebarId, overlayId) {
        const toggle = $(`#${toggleId}`);
        const sidebar = $(`#${sidebarId}`);
        const overlay = $(`#${overlayId}`);
        if (!toggle || !sidebar)
            return;
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay === null || overlay === void 0 ? void 0 : overlay.classList.toggle('show');
        });
        overlay === null || overlay === void 0 ? void 0 : overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
        // Close sidebar when a nav button is clicked (mobile)
        sidebar.querySelectorAll('.sb-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay === null || overlay === void 0 ? void 0 : overlay.classList.remove('show');
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
            if (session.role === 'admin')
                enterAdmin();
            else
                enterClient();
        }
        else {
            showScreen(loginScreen);
        }
        // Auto-refresh data every 30s
        setInterval(() => {
            if (!currentUser)
                return;
            if (currentUser.role === 'admin')
                loadAndRenderAdmin();
            else
                loadAndRenderClient();
        }, 30000);
    }
    // Close modals on background click
    window.addEventListener('click', (e) => {
        if (e.target === createModal)
            closeTicketModal();
        if (e.target === ratingModal)
            closeRatingModal();
        if (e.target === articleModal)
            closeArticleModal();
    });
    init();
})();
