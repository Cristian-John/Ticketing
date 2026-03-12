/* ===================================
   IT Support Ticketing System
   Application Logic — API-Driven
   =================================== */

(function () {
    'use strict';

    // ==================== CONSTANTS ====================

    const DEPARTMENTS = [
        'Executive', 'Marketing', 'I-Wallet', 'Admin', 'I-Tech',
        'Joint Ventures', 'IT', 'Customer Care', 'Secretary',
        'Real Estate', 'Corporate'
    ];

    const AGENTS = ['Sean Khayle', 'CJ', 'Jeremiah', 'Clarence'];

    function getAssignees(ticket) {
        if (!ticket.assignee || ticket.assignee === 'Unassigned') return [];
        return ticket.assignee.split(',').map(a => a.trim()).filter(Boolean);
    }

    function formatAssignees(ticket) {
        const list = getAssignees(ticket);
        return list.length > 0 ? list.join(', ') : 'Unassigned';
    }

    const SESSION_KEY = 'itsupport_session';
    const API = '/api';

    // ==================== API LAYER ====================

    async function api(path, opts = {}) {
        const res = await fetch(`${API}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...opts,
            body: opts.body ? JSON.stringify(opts.body) : undefined,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    }

    const ticketsAPI = {
        list: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return api(`/tickets${qs ? '?' + qs : ''}`);
        },
        get: (id) => api(`/tickets/${id}`),
        create: (data) => api('/tickets', { method: 'POST', body: data }),
        update: (id, data) => api(`/tickets/${id}`, { method: 'PUT', body: data }),
        delete: (id) => api(`/tickets/${id}`, { method: 'DELETE' }),
        addNote: (id, data) => api(`/tickets/${id}/notes`, { method: 'POST', body: data }),
        stats: () => api('/stats'),
    };

    // ==================== SESSION ====================

    function getSession() {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
        catch { return null; }
    }
    function setSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
    function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

    // ==================== DOM HELPERS ====================

    const $ = (s, p) => (p || document).querySelector(s);
    const $$ = (s, p) => (p || document).querySelectorAll(s);

    function el(tag, attrs = {}, children = []) {
        const e = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
            else if (k === 'className') e.className = v;
            else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
            else e.setAttribute(k, v);
        }
        for (const c of children) {
            if (typeof c === 'string') e.appendChild(document.createTextNode(c));
            else if (c) e.appendChild(c);
        }
        return e;
    }

    function html(container, htmlStr) {
        container.innerHTML = htmlStr;
    }

    // ==================== FORMATTERS ====================

    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    }

    function formatDateTime(iso) {
        if (!iso) return '—';
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

    function starsHTML(n, small) {
        let h = `<span class="stars${small ? ' stars-sm' : ''}">`;
        for (let i = 1; i <= 5; i++) h += `<span class="star${i <= n ? '' : ' off'}">⭐</span>`;
        return h + '</span>';
    }

    function isResolved(t) {
        return t.status === 'Resolved' || t.status === 'Closed';
    }

    // ==================== AUDIO ====================

    let audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
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

    function showToast(message, type = 'success') {
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

    // ==================== SCREEN SWITCHING ====================

    const loginScreen = $('#login-screen');
    const clientScreen = $('#client-screen');
    const adminScreen = $('#admin-screen');

    function showScreen(screen) {
        $$('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    // ==================== STATE ====================

    let currentUser = null;
    let allTickets = [];
    let prevTicketCount = 0;
    let adminView = 'dashboard';
    let clientView = 'my-tickets';
    let selectedTicketId = null;
    let ratingPromptShown = false;

    // ==================== AUTH ====================

    const loginForm = $('#login-form');
    const passwordGroup = $('#password-group');
    const loginRole = $('#login-role');

    // Toggle password field based on role
    loginRole.addEventListener('change', function () {
        if (this.value === 'admin') {
            passwordGroup.style.display = '';
            $('#login-password').setAttribute('required', 'true');
        } else {
            passwordGroup.style.display = 'none';
            $('#login-password').removeAttribute('required');
            $('#login-password').value = '';
        }
    });

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const username = $('#login-username').value.trim();
        const role = $('#login-role').value;

        if (!username) {
            showToast('Please enter your name', 'error');
            return;
        }

        if (role === 'admin') {
            const password = $('#login-password').value.trim();
            if (!password) {
                showToast('Password is required for admin login', 'error');
                return;
            }
            if (password !== '@inspireSupport') {
                showToast('Incorrect admin password', 'error');
                return;
            }
        }

        currentUser = { username, role };
        setSession(currentUser);

        if (role === 'admin') enterAdmin();
        else enterClient();

        loginForm.reset();
        passwordGroup.style.display = 'none';
        showToast(`Welcome, ${username}!`, 'success');
    });

    function logout() {
        clearSession();
        currentUser = null;
        allTickets = [];
        prevTicketCount = 0;
        showScreen(loginScreen);
        showToast('Logged out successfully', 'info');
    }

    // Logout buttons
    $('#client-logout-btn').addEventListener('click', logout);
    $('#admin-logout-btn').addEventListener('click', logout);

    // ==================== ENTER CLIENT ====================

    async function enterClient() {
        currentUser = getSession();
        $('#client-sidebar-name').textContent = currentUser.username;
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
        const mine = allTickets.filter(t => t.requester === currentUser.username);

        // Update sidebar stats
        $('#cs-open').textContent = mine.filter(t => t.status === 'Open').length;
        $('#cs-active').textContent = mine.filter(t => t.status === 'In Progress').length;
        $('#cs-resolved').textContent = mine.filter(t => isResolved(t)).length;

        const toRate = mine.filter(t => isResolved(t) && t.rating === null).length;
        const rateBadge = $('#client-to-rate-badge');
        if (toRate > 0) {
            rateBadge.style.display = '';
            rateBadge.textContent = `${toRate} to rate`;
        } else {
            rateBadge.style.display = 'none';
        }

        const content = $('#client-content');
        const titleEl = $('#client-page-title');

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
                $('#empty-submit-btn').addEventListener('click', () => openTicketModal());
            } else {
                renderClientList(content, mine);

                // Auto-prompt rating for the first unrated resolved ticket
                if (!ratingPromptShown) {
                    const unrated = mine.find(t => isResolved(t) && t.rating === null);
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
                // Auto-prompt rating when viewing a resolved unrated ticket
                if (!ratingPromptShown && isResolved(ticket) && ticket.rating === null) {
                    ratingPromptShown = true;
                    setTimeout(() => openRatingModal(ticket), 400);
                }
            }
            else { clientView = 'my-tickets'; renderClientView(); }
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
                        <div style="font-weight:600;font-size:15px;color:#eee;margin-bottom:4px">${esc(t.title)}</div>
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
                if (e.target.classList.contains('rate-btn')) return;
                selectedTicketId = t.id;
                clientView = 'detail';
                renderClientView();
            });
            container.appendChild(card);
        });

        // Rate button handlers
        container.querySelectorAll('.rate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ticket = allTickets.find(t => t.id === btn.dataset.id);
                if (ticket) openRatingModal(ticket);
            });
        });
    }

    function renderClientDetail(container, ticket) {
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
                    </div>
                </div>
                <button class="btn-back" id="client-back-btn">← Back</button>
            </div>
            <div class="detail-grid detail-grid-client">
                <div class="detail-main">
                    <div class="panel">
                        <div class="panel-header">Issue Description</div>
                        <p style="color:#aaa;line-height:1.75;margin:0;font-size:14px">${esc(ticket.description)}</p>
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
                        ${[['ID', ticket.id], ['Department', ticket.department], ['Category', ticket.category], ['Severity', ticket.severity], ['Assignee(s)', formatAssignees(ticket)], ['Submitted', formatDate(ticket.createdAt)], ['Updated', formatDate(ticket.updatedAt)]].map(([k, v]) => `
                            <div class="detail-info-row">
                                <span class="detail-info-key">${k}</span>
                                <span class="detail-info-val">${esc(v)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        $('#client-back-btn').addEventListener('click', () => {
            clientView = 'my-tickets';
            selectedTicketId = null;
            renderClientView();
        });

        const rateBtn = $('#detail-rate-btn');
        if (rateBtn) {
            rateBtn.addEventListener('click', () => openRatingModal(ticket));
        }
    }

    // Client nav
    $$('#client-sidebar .sb-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('#client-sidebar .sb-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            clientView = btn.dataset.view;
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

        // New ticket notification
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
        const avg = rated.length ? (rated.reduce((s, t) => s + t.rating, 0) / rated.length).toFixed(1) : '—';

        $('#as-open').textContent = open;
        $('#as-progress').textContent = inProg;
        $('#as-severe').textContent = severe;
        $('#as-resolved').textContent = resolved;
        $('#as-rating').textContent = avg + (avg !== '—' ? '★' : '');

        const badge = $('#admin-open-badge');
        if (open > 0) { badge.style.display = ''; badge.textContent = open; }
        else badge.style.display = 'none';
    }

    function updateAdminNav() {
        $$('#admin-sidebar .sb-nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === adminView || (adminView === 'detail' && b.dataset.view === 'all-tickets'));
        });
        const filters = $('#admin-filters');
        filters.style.display = (adminView === 'all-tickets' || adminView === 'detail') ? '' : 'none';
    }

    function renderAdminView() {
        const content = $('#admin-content');
        const titleEl = $('#admin-page-title');
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
        }
    }

    function getFilteredTickets() {
        const status = ($('#admin-filter-status') || {}).value || 'all';
        const severity = ($('#admin-filter-severity') || {}).value || 'all';
        const dept = ($('#admin-filter-dept') || {}).value || 'all';
        const search = ($('#admin-search') || {}).value || '';

        return allTickets
            .filter(t => status === 'all' || t.status === status)
            .filter(t => severity === 'all' || t.severity === severity)
            .filter(t => dept === 'all' || t.department === dept)
            .filter(t => !search || [t.id, t.title, t.requester, t.department, t.description || ''].join(' ').toLowerCase().includes(search.toLowerCase()));
    }

    // Admin nav
    $$('#admin-sidebar .sb-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            adminView = btn.dataset.view;
            selectedTicketId = null;
            updateAdminNav();
            renderAdminView();
        });
    });

    // Admin filters
    ['admin-search', 'admin-filter-status', 'admin-filter-severity', 'admin-filter-dept'].forEach(id => {
        const el = $(`#${id}`);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
            if (adminView === 'all-tickets') renderAdminView();
        });
    });

    // ==================== ADMIN DASHBOARD ====================

    function renderAdminDashboard(container) {
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

        // Severe list
        const severeList = $('#dash-severe-list');
        if (severeTickets.length === 0) {
            severeList.innerHTML = '<div class="empty-state" style="padding:18px 0">All clear 🎉</div>';
        } else {
            severeTickets.forEach(t => severeList.appendChild(miniCard(t)));
        }

        // Recent list
        const recentList = $('#dash-recent-list');
        recent.forEach(t => recentList.appendChild(miniCard(t, true)));

        // Dept chart
        const deptChart = $('#dash-dept-chart');
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

        // Ratings
        const ratingsList = $('#dash-ratings-list');
        if (topRated.length === 0) {
            ratingsList.innerHTML = '<div class="empty-state" style="padding:18px 0">No ratings yet</div>';
        } else {
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

        // Nav links
        $('#dash-view-all').addEventListener('click', () => { adminView = 'all-tickets'; renderAdminView(); });
        $('#dash-view-resolved').addEventListener('click', () => { adminView = 'resolved'; renderAdminView(); });
    }

    function miniCard(ticket, compact) {
        const card = el('div', { className: 'mini-card', style: { borderLeft: `3px solid ${getSeverityColor(ticket.severity)}` } });
        card.innerHTML = `
            <div class="mini-card-top">
                <span class="mini-card-id">${esc(ticket.id)}</span>
                <span class="${statusClass(ticket.status)}">${esc(ticket.status)}</span>
            </div>
            <div class="mini-card-title">${esc(ticket.title)}</div>
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

    // ==================== ADMIN TICKET TABLE ====================

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
        if (tickets.length === 0) {
            body.innerHTML = '<div class="empty-state" style="padding:30px">No tickets found.</div>';
            return;
        }
        tickets.forEach(t => {
            const row = el('div', { className: 'table-row' });
            row.innerHTML = `
                <span style="flex:0 0 88px;font-family:monospace;font-size:10px;color:var(--text-muted)">${esc(t.id)}</span>
                <span style="flex:1;font-weight:600;color:#eee;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span>
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

    // ==================== RESOLVED VIEW ====================

    function renderResolvedView(container) {
        const resolved = allTickets.filter(t => isResolved(t));
        const rated = resolved.filter(t => t.rating !== null);
        const avg = rated.length ? (rated.reduce((s, t) => s + t.rating, 0) / rated.length).toFixed(1) : null;

        container.innerHTML = `
            <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
                ${[
                { l: 'Resolved', v: resolved.length, c: 'var(--status-resolved)', i: '✅' },
                { l: 'Rated', v: rated.length, c: 'var(--severity-moderate)', i: '⭐' },
                { l: 'Awaiting', v: resolved.length - rated.length, c: '#888', i: '⬜' },
                { l: 'Avg Score', v: avg ? avg + '★' : '—', c: 'var(--severity-moderate)', i: '📊' },
            ].map(c => `
                    <div class="stat-card" style="border-top:3px solid ${c.c}">
                        <div class="stat-icon">${c.i}</div>
                        <div class="stat-number" style="color:${c.c}">${c.v}</div>
                        <div class="stat-label">${c.l}</div>
                    </div>
                `).join('')}
            </div>

            ${rated.length > 0 ? `
            <div class="panel" style="margin-bottom:16px">
                <div class="panel-header" style="color:var(--severity-moderate)">⭐ Rating Breakdown</div>
                <div class="rating-bars">
                    ${[5, 4, 3, 2, 1].map(star => {
                const cnt = rated.filter(t => t.rating === star).length;
                const pct = rated.length ? (cnt / rated.length) * 100 : 0;
                return `
                        <div class="rating-bar-col">
                            <div class="rating-bar-count">${cnt}</div>
                            <div class="rating-bar-track">
                                <div class="rating-bar-fill" style="height:${Math.max(pct > 0 ? 8 : 0, pct)}%"></div>
                            </div>
                            <div class="rating-bar-label">${star}★</div>
                        </div>
                    `;
            }).join('')}
                </div>
            </div>` : ''}

            <div class="panel">
                <div class="panel-header">
                    All Resolved Tickets
                    <span style="color:var(--text-muted);font-size:11px;font-weight:400">${resolved.length} total</span>
                </div>
                <div id="resolved-list"></div>
            </div>
        `;

        const list = $('#resolved-list');
        if (resolved.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:18px 0">No resolved tickets yet.</div>';
        } else {
            resolved.forEach(t => {
                const row = el('div', { className: 'resolved-row' });
                row.innerHTML = `
                    <div style="flex:1;min-width:0">
                        <div style="display:flex;gap:7px;align-items:center;margin-bottom:4px;flex-wrap:wrap">
                            <span style="font-family:monospace;font-size:10px;color:var(--text-muted)">${esc(t.id)}</span>
                            <span class="${statusClass(t.status)}">${esc(t.status)}</span>
                            <span class="badge-dept">${esc(t.department)}</span>
                        </div>
                        <div style="font-weight:600;font-size:13px;color:#ddd;margin-bottom:2px">${esc(t.title)}</div>
                        <div style="font-size:11px;color:var(--text-muted)">By ${esc(t.assignee)} · ${formatDate(t.updatedAt)}</div>
                        ${t.ratingComment ? `<div class="rating-comment" style="margin-top:6px">"${esc(t.ratingComment)}"</div>` : ''}
                    </div>
                    <div style="flex-shrink:0;text-align:right">
                        ${t.rating !== null
                        ? `${starsHTML(t.rating)}<div style="font-size:11px;color:var(--severity-moderate);font-weight:700;margin-top:2px">${t.rating}/5</div>`
                        : '<span style="font-size:11px;color:#444;font-style:italic">Not rated</span>'}
                        <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${esc(t.requester)}</div>
                    </div>
                `;
                row.addEventListener('click', () => {
                    adminView = 'detail';
                    selectedTicketId = t.id;
                    renderAdminView();
                });
                list.appendChild(row);
            });
        }
    }

    // ==================== ADMIN DETAIL ====================

    function renderAdminDetail(container, ticket) {
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
                    </div>
                </div>
                <button class="btn-back" id="admin-back-btn">← Back</button>
            </div>
            <div class="detail-grid">
                <div class="detail-main">
                    <div class="panel">
                        <div class="panel-header">Description</div>
                        <p style="color:#aaa;line-height:1.75;margin:0;font-size:14px">${esc(ticket.description)}</p>
                    </div>
                    ${isResolved(ticket) ? `
                    <div class="panel" style="border:${ticket.rating !== null ? '1px solid rgba(240,192,64,0.25)' : '1px solid var(--border)'}">
                        <div class="panel-header" style="color:var(--severity-moderate)">⭐ Client Rating</div>
                        ${ticket.rating !== null ? `
                            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                                ${starsHTML(ticket.rating)}
                                <span style="color:var(--severity-moderate);font-weight:800;font-size:20px">${ticket.rating}/5</span>
                            </div>
                            ${ticket.ratingComment ? `<div class="rating-comment">"${esc(ticket.ratingComment)}"</div>` : ''}
                        ` : '<div class="empty-state" style="padding:12px 0">Not yet rated by client.</div>'}
                    </div>` : ''}
                    <div class="panel">
                        <div class="panel-header">Activity Log</div>
                        <div id="notes-list" style="max-height:200px;overflow-y:auto"></div>
                        <div style="margin-top:10px">
                            <textarea class="note-textarea" id="admin-note-input" placeholder="Add a note… (Ctrl+Enter)"></textarea>
                            <button class="btn btn-primary btn-sm" id="post-note-btn" style="margin-top:6px">Post Note</button>
                        </div>
                    </div>
                </div>
                <div class="detail-side">
                    <div class="panel">
                        <div class="panel-header">Details</div>
                        ${[['Requester', ticket.requester], ['Department', ticket.department], ['Created', formatDate(ticket.createdAt)], ['Updated', formatDate(ticket.updatedAt)]].map(([k, v]) => `
                            <div class="detail-info-row">
                                <span class="detail-info-key">${k}</span>
                                <span class="detail-info-val">${esc(v)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="panel">
                        <div class="panel-header">Manage</div>
                        <label style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px;display:block">Status</label>
                        <select class="manage-select" id="manage-status">
                            ${['Open', 'In Progress', 'Resolved', 'Closed'].map(s => `<option ${s === ticket.status ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                        <label style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-top:8px;margin-bottom:4px;display:block">Severity</label>
                        <select class="manage-select" id="manage-severity">
                            ${['Low', 'Moderate', 'Severe'].map(s => `<option ${s === ticket.severity ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                        <label style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-top:8px;margin-bottom:4px;display:block">Assignees</label>
                        <div class="assignee-checklist" id="manage-assignees">
                            ${AGENTS.map(a => {
                                const checked = getAssignees(ticket).includes(a);
                                return `<label class="assignee-check-item">
                                    <input type="checkbox" value="${esc(a)}" ${checked ? 'checked' : ''}>
                                    <span>${esc(a)}</span>
                                </label>`;
                            }).join('')}
                        </div>
                        <button class="btn btn-primary" id="save-manage-btn" style="margin-top:14px;width:100%">Save Changes</button>
                        <button class="btn btn-danger" id="delete-ticket-btn" style="margin-top:8px;width:100%">Delete Ticket</button>
                    </div>
                </div>
            </div>
        `;

        // Notes
        const notesList = $('#notes-list');
        if (notes.length === 0) {
            notesList.innerHTML = '<div class="empty-state" style="padding:12px 0">No notes yet.</div>';
        } else {
            notes.forEach(n => {
                const noteEl = el('div', { className: 'note-item' });
                noteEl.innerHTML = `
                    <span class="note-author">${esc(n.author)}<span class="note-time">${esc(n.time)}</span></span>
                    <div class="note-text">${esc(n.text)}</div>
                `;
                notesList.appendChild(noteEl);
            });
        }

        // Back
        $('#admin-back-btn').addEventListener('click', () => {
            adminView = 'all-tickets';
            selectedTicketId = null;
            renderAdminView();
        });

        // Post note
        const noteInput = $('#admin-note-input');
        $('#post-note-btn').addEventListener('click', () => postNote(ticket.id, noteInput));
        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postNote(ticket.id, noteInput);
        });

        // Save manage changes
        $('#save-manage-btn').addEventListener('click', async () => {
            const newStatus = $('#manage-status').value;

            // Block closing if not yet rated by client
            if (newStatus === 'Closed' && ticket.rating === null) {
                showToast('Cannot close — client hasn\'t rated this ticket yet', 'error');
                return;
            }

            try {
                const checkedAgents = [...document.querySelectorAll('#manage-assignees input:checked')].map(cb => cb.value);
                const assigneeVal = checkedAgents.length > 0 ? checkedAgents.join(', ') : 'Unassigned';

                await ticketsAPI.update(ticket.id, {
                    status: newStatus,
                    severity: $('#manage-severity').value,
                    assignee: assigneeVal,
                });
                showToast('Ticket updated');
                await loadAndRenderAdmin();
                // Re-select the ticket
                adminView = 'detail';
                selectedTicketId = ticket.id;
                renderAdminView();
            } catch (err) {
                showToast('Failed to update: ' + err.message, 'error');
            }
        });

        // Delete
        $('#delete-ticket-btn').addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;
            try {
                await ticketsAPI.delete(ticket.id);
                showToast(`Ticket ${ticket.id} deleted`, 'error');
                adminView = 'all-tickets';
                selectedTicketId = null;
                await loadAndRenderAdmin();
            } catch (err) {
                showToast('Failed to delete: ' + err.message, 'error');
            }
        });
    }

    async function postNote(ticketId, inputEl) {
        const text = inputEl.value.trim();
        if (!text) return;
        try {
            await ticketsAPI.addNote(ticketId, { text, author: currentUser.username });
            inputEl.value = '';
            showToast('Note posted');
            // Refresh
            allTickets = await ticketsAPI.list();
            adminView = 'detail';
            selectedTicketId = ticketId;
            renderAdminView();
        } catch (err) {
            showToast('Failed to post note: ' + err.message, 'error');
        }
    }

    // ==================== NOTIFICATION BANNER ====================

    function showNotifBanner(msg, type, ticketId) {
        const banner = $('#notif-banner');
        banner.style.display = '';
        banner.className = `notif-banner notif-${type}`;
        $('#notif-msg').textContent = msg;
        setTimeout(() => { banner.style.display = 'none'; }, 6000);
    }

    $('#notif-close').addEventListener('click', () => {
        $('#notif-banner').style.display = 'none';
    });

    // ==================== NEW TICKET MODAL ====================

    const ticketModal = $('#ticket-modal');
    const ticketForm = $('#ticket-form');

    function openTicketModal() {
        ticketModal.classList.add('show');
        $('#ticket-title').focus();
    }

    function closeTicketModal() {
        ticketModal.classList.remove('show');
        ticketForm.reset();
        $('#custom-dept-group').classList.add('hidden');
    }

    // New ticket buttons
    $('#client-new-ticket-btn').addEventListener('click', openTicketModal);
    $('#admin-new-ticket-btn').addEventListener('click', openTicketModal);
    $('#close-modal-btn').addEventListener('click', closeTicketModal);
    $('#cancel-modal-btn').addEventListener('click', closeTicketModal);

    // Department "other"
    $('#ticket-department').addEventListener('change', function () {
        const custom = $('#custom-dept-group');
        const input = $('#ticket-custom-department');
        if (this.value === 'other') {
            custom.classList.remove('hidden');
            input.setAttribute('required', 'true');
        } else {
            custom.classList.add('hidden');
            input.removeAttribute('required');
            input.value = '';
        }
    });

    // Submit ticket
    ticketForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const title = $('#ticket-title').value.trim();
        let department = $('#ticket-department').value;
        const severity = $('#ticket-severity').value;
        const category = $('#ticket-category').value;
        const description = $('#ticket-description').value.trim();

        if (department === 'other') {
            department = $('#ticket-custom-department').value.trim();
            if (!department) {
                showToast('Please specify your department', 'error');
                return;
            }
        }

        if (!title || !department || !severity || !description) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const ticket = await ticketsAPI.create({
                title,
                department,
                severity,
                category,
                description,
                requester: currentUser.username,
            });
            closeTicketModal();
            showToast(`Ticket ${ticket.id} submitted!`);

            if (currentUser.role === 'admin') {
                await loadAndRenderAdmin();
            } else {
                await loadAndRenderClient();
            }
        } catch (err) {
            showToast('Failed to create ticket: ' + err.message, 'error');
        }
    });

    // Close modals on overlay click
    ticketModal.addEventListener('click', (e) => { if (e.target === ticketModal) closeTicketModal(); });

    // ==================== VIEW TICKET MODAL (for client simple view) ====================

    const viewModal = $('#view-ticket-modal');
    $('#close-view-modal-btn').addEventListener('click', () => viewModal.classList.remove('show'));
    viewModal.addEventListener('click', (e) => { if (e.target === viewModal) viewModal.classList.remove('show'); });

    // ==================== RATING MODAL ====================

    const ratingModal = $('#rating-modal');
    let currentRating = 0;
    let currentRatingTicket = null;

    function openRatingModal(ticket) {
        currentRating = 0;
        currentRatingTicket = ticket;
        ratingModal.classList.add('show');
        const body = $('#rating-modal-body');
        const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

        body.innerHTML = `
            <div style="padding:24px">
                <div style="margin-bottom:18px;padding:10px 14px;background:var(--bg-body);border-radius:7px;border-left:3px solid #2a2a35">
                    <div style="font-size:10px;color:var(--text-muted);letter-spacing:1px;margin-bottom:3px">TICKET</div>
                    <div style="font-size:13px;color:#ccc;font-weight:600">${esc(ticket.title)}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${esc(ticket.id)} · Resolved by ${esc(ticket.assignee)}</div>
                </div>
                <div style="text-align:center;margin-bottom:4px">
                    <div style="font-size:12px;color:#777;margin-bottom:16px">How satisfied were you?</div>
                    <div id="rating-stars-container" style="display:flex;justify-content:center;gap:8px;margin-bottom:10px"></div>
                    <div id="rating-label" class="rating-label"></div>
                </div>
                <label style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-top:8px;margin-bottom:4px;display:block">Comment (optional)</label>
                <textarea class="note-textarea" id="rating-comment" placeholder="Share your experience…" style="height:76px;margin-bottom:16px"></textarea>
                <div style="display:flex;gap:10px">
                    <button type="button" class="btn btn-ghost" id="rating-cancel-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="rating-submit-btn" style="flex:1;opacity:0.4">Submit Rating</button>
                </div>
            </div>
        `;

        updateRatingStars();

        document.getElementById('rating-cancel-btn').onclick = function () { closeRatingModal(); };
        document.getElementById('rating-submit-btn').onclick = async function () {
            if (currentRating === 0) {
                showToast('Please select a rating first', 'error');
                return;
            }
            try {
                await ticketsAPI.update(currentRatingTicket.id, {
                    rating: currentRating,
                    ratingComment: (document.getElementById('rating-comment') || {}).value || '',
                });
                closeRatingModal();
                showToast('Rating submitted! Thank you.');
                if (currentUser.role === 'admin') await loadAndRenderAdmin();
                else await loadAndRenderClient();
            } catch (err) {
                showToast('Failed to submit rating: ' + err.message, 'error');
            }
        };
    }

    function updateRatingStars() {
        const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        const container = document.getElementById('rating-stars-container');
        const label = document.getElementById('rating-label');
        const submitBtn = document.getElementById('rating-submit-btn');
        if (!container) return;

        container.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const starBtn = document.createElement('button');
            starBtn.type = 'button';
            starBtn.className = 'rating-star-btn' + (currentRating >= i ? '' : ' off');
            starBtn.textContent = '⭐';
            starBtn.onclick = function () {
                currentRating = i;
                updateRatingStars();
            };
            container.appendChild(starBtn);
        }

        if (label) label.textContent = currentRating > 0 ? labels[currentRating] : '';
        if (submitBtn) submitBtn.style.opacity = currentRating > 0 ? '1' : '0.4';
    }

    function closeRatingModal() {
        ratingModal.classList.remove('show');
        currentRating = 0;
        currentRatingTicket = null;
    }

    document.getElementById('close-rating-modal-btn').onclick = function () { closeRatingModal(); };
    ratingModal.addEventListener('click', (e) => { if (e.target === ratingModal) closeRatingModal(); });

    // ==================== HELPERS ====================

    function getSeverityColor(severity) {
        const map = {
            'Severe': 'var(--severity-severe)',
            'Moderate': 'var(--severity-moderate)',
            'Low': 'var(--severity-low)',
        };
        return map[severity] || 'var(--severity-moderate)';
    }

    // ==================== KEYBOARD ====================

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (ticketModal.classList.contains('show')) closeTicketModal();
            if (viewModal.classList.contains('show')) viewModal.classList.remove('show');
            if (ratingModal.classList.contains('show')) closeRatingModal();
        }
    });

    // ==================== INIT ====================

    function init() {
        const session = getSession();
        if (session) {
            currentUser = session;
            if (session.role === 'admin') enterAdmin();
            else enterClient();
        } else {
            showScreen(loginScreen);
        }
    }

    init();

})();
