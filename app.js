/* ===================================
   IT Support Ticketing System
   Application Logic
   =================================== */

(function () {
    'use strict';

    // ==================== DATA LAYER ====================

    const DEPARTMENTS = [
        'Executive', 'Marketing', 'I-Wallet', 'Admin', 'I-Tech',
        'Joint Ventures', 'IT', 'Customer Care', 'Secretary',
        'Real Estate', 'Corporate'
    ];

    const STORAGE_KEY = 'itsupport_tickets';
    const SESSION_KEY = 'itsupport_session';

    function loadTickets() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch { return []; }
    }

    function saveTickets(tickets) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    }

    function getSession() {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY));
        } catch { return null; }
    }

    function setSession(session) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function generateId() {
        const now = new Date();
        const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        return `TKT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${num}`;
    }

    function formatDate(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // ==================== DOM REFERENCES ====================

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    // Screens
    const loginScreen = $('#login-screen');
    const clientScreen = $('#client-screen');
    const adminScreen = $('#admin-screen');

    // Login
    const loginForm = $('#login-form');
    const loginUsername = $('#login-username');
    const loginPassword = $('#login-password');
    const loginRole = $('#login-role');

    // Client
    const clientAvatar = $('#client-avatar');
    const clientUsername = $('#client-username');
    const clientLogoutBtn = $('#client-logout-btn');
    const openTicketModalBtn = $('#open-ticket-modal-btn');
    const clientTicketsBody = $('#client-tickets-body');
    const clientEmptyState = $('#client-empty-state');
    const clientSearch = $('#client-search');

    // Client Stats
    const clientTotal = $('#client-total');
    const clientOpen = $('#client-open');
    const clientProgress = $('#client-progress');
    const clientResolved = $('#client-resolved');

    // Admin
    const adminAvatar = $('#admin-avatar');
    const adminUsername = $('#admin-username');
    const adminLogoutBtn = $('#admin-logout-btn');
    const adminNewTicketBtn = $('#admin-new-ticket-btn');
    const adminTicketsBody = $('#admin-tickets-body');
    const adminEmptyState = $('#admin-empty-state');
    const adminSearch = $('#admin-search');
    const adminFilterStatus = $('#admin-filter-status');
    const adminFilterSeverity = $('#admin-filter-severity');
    const adminFilterDept = $('#admin-filter-dept');

    // Admin Stats
    const adminTotal = $('#admin-total');
    const adminOpen = $('#admin-open');
    const adminProgress = $('#admin-progress');
    const adminResolved = $('#admin-resolved');
    const adminSevere = $('#admin-severe');

    // New Ticket Modal
    const ticketModal = $('#ticket-modal');
    const ticketForm = $('#ticket-form');
    const closeModalBtn = $('#close-modal-btn');
    const cancelModalBtn = $('#cancel-modal-btn');
    const ticketName = $('#ticket-name');
    const ticketDepartment = $('#ticket-department');
    const customDeptGroup = $('#custom-dept-group');
    const ticketCustomDept = $('#ticket-custom-department');
    const ticketSeverity = $('#ticket-severity');
    const ticketDescription = $('#ticket-description');

    // View Ticket Modal
    const viewTicketModal = $('#view-ticket-modal');
    const closeViewModalBtn = $('#close-view-modal-btn');
    const ticketDetailsContent = $('#ticket-details-content');
    const adminTicketActions = $('#admin-ticket-actions');
    const updateStatus = $('#update-status');
    const saveStatusBtn = $('#save-status-btn');
    const deleteTicketBtn = $('#delete-ticket-btn');

    // Toast
    const toastContainer = $('#toast-container');

    // State
    let currentUser = null;
    let viewingTicketId = null;

    // ==================== TOAST ====================

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' :
                type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' :
                '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
            </svg>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ==================== SCREEN SWITCHING ====================

    function showScreen(screen) {
        $$('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    // ==================== AUTH ====================

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();
        const role = loginRole.value;

        if (!username || !password) {
            showToast('Please enter username and password', 'error');
            return;
        }

        currentUser = { username, role };
        setSession(currentUser);

        if (role === 'admin') {
            enterAdmin();
        } else {
            enterClient();
        }

        loginForm.reset();
        showToast(`Welcome, ${username}!`, 'success');
    });

    function enterClient() {
        currentUser = getSession();
        clientAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        clientUsername.textContent = currentUser.username;
        showScreen(clientScreen);
        renderClientTickets();
    }

    function enterAdmin() {
        currentUser = getSession();
        adminAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        adminUsername.textContent = currentUser.username;
        showScreen(adminScreen);
        renderAdminTickets();
    }

    function logout() {
        clearSession();
        currentUser = null;
        showScreen(loginScreen);
        showToast('Logged out successfully', 'info');
    }

    clientLogoutBtn.addEventListener('click', logout);
    adminLogoutBtn.addEventListener('click', logout);

    // ==================== TICKET MODAL ====================

    function openModal() {
        ticketModal.classList.add('show');
        ticketName.focus();
    }

    function closeModal() {
        ticketModal.classList.remove('show');
        ticketForm.reset();
        customDeptGroup.classList.add('hidden');
    }

    openTicketModalBtn.addEventListener('click', openModal);
    adminNewTicketBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    // Show/hide custom department field
    ticketDepartment.addEventListener('change', function () {
        if (this.value === 'other') {
            customDeptGroup.classList.remove('hidden');
            ticketCustomDept.setAttribute('required', 'true');
        } else {
            customDeptGroup.classList.add('hidden');
            ticketCustomDept.removeAttribute('required');
            ticketCustomDept.value = '';
        }
    });

    // Close modals on overlay click
    ticketModal.addEventListener('click', function (e) {
        if (e.target === ticketModal) closeModal();
    });
    viewTicketModal.addEventListener('click', function (e) {
        if (e.target === viewTicketModal) closeViewModal();
    });

    // ==================== SUBMIT TICKET ====================

    ticketForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = ticketName.value.trim();
        let department = ticketDepartment.value;
        const severity = ticketSeverity.value;
        const description = ticketDescription.value.trim();

        if (department === 'other') {
            department = ticketCustomDept.value.trim();
            if (!department) {
                showToast('Please specify your department', 'error');
                ticketCustomDept.focus();
                return;
            }
        }

        if (!name || !department || !severity || !description) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const tickets = loadTickets();
        const newTicket = {
            id: generateId(),
            name,
            department,
            severity,
            description,
            status: 'Open',
            submittedBy: currentUser.username,
            createdAt: new Date().toISOString()
        };

        tickets.unshift(newTicket);
        saveTickets(tickets);
        closeModal();

        if (currentUser.role === 'admin') {
            renderAdminTickets();
        } else {
            renderClientTickets();
        }

        showToast(`Ticket ${newTicket.id} submitted successfully!`, 'success');
    });

    // ==================== VIEW TICKET ====================

    function openViewModal(ticketId) {
        const tickets = loadTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        viewingTicketId = ticketId;

        ticketDetailsContent.innerHTML = `
            <div class="detail-row">
                <div class="detail-item">
                    <div class="detail-label">Ticket ID</div>
                    <div class="detail-value">${ticket.id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Date Submitted</div>
                    <div class="detail-value">${formatDate(ticket.createdAt)}</div>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">${escapeHtml(ticket.name)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Submitted By</div>
                    <div class="detail-value">${escapeHtml(ticket.submittedBy)}</div>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <div class="detail-label">Department</div>
                    <div class="detail-value">${escapeHtml(ticket.department)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Severity</div>
                    <div class="detail-value"><span class="badge badge-${ticket.severity.toLowerCase()}">${ticket.severity}</span></div>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value"><span class="badge ${getStatusBadgeClass(ticket.status)}">${ticket.status}</span></div>
                </div>
            </div>
            <div>
                <div class="detail-label">Description</div>
                <div class="detail-description">${escapeHtml(ticket.description)}</div>
            </div>
        `;

        // Show admin controls only for admin
        if (currentUser && currentUser.role === 'admin') {
            adminTicketActions.style.display = '';
            updateStatus.value = ticket.status;
        } else {
            adminTicketActions.style.display = 'none';
        }

        viewTicketModal.classList.add('show');
    }

    function closeViewModal() {
        viewTicketModal.classList.remove('show');
        viewingTicketId = null;
    }

    closeViewModalBtn.addEventListener('click', closeViewModal);

    // Admin: update ticket status
    saveStatusBtn.addEventListener('click', function () {
        if (!viewingTicketId) return;
        const tickets = loadTickets();
        const idx = tickets.findIndex(t => t.id === viewingTicketId);
        if (idx === -1) return;

        tickets[idx].status = updateStatus.value;
        saveTickets(tickets);
        closeViewModal();
        renderAdminTickets();
        showToast(`Ticket ${tickets[idx].id} updated to "${updateStatus.value}"`, 'success');
    });

    // Admin: delete ticket
    deleteTicketBtn.addEventListener('click', function () {
        if (!viewingTicketId) return;
        if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;

        let tickets = loadTickets();
        const deletedId = viewingTicketId;
        tickets = tickets.filter(t => t.id !== viewingTicketId);
        saveTickets(tickets);
        closeViewModal();
        renderAdminTickets();
        showToast(`Ticket ${deletedId} deleted`, 'error');
    });

    // ==================== RENDER CLIENT TICKETS ====================

    function renderClientTickets(searchQuery) {
        const tickets = loadTickets().filter(t => t.submittedBy === currentUser.username);

        // Update stats
        clientTotal.textContent = tickets.length;
        clientOpen.textContent = tickets.filter(t => t.status === 'Open').length;
        clientProgress.textContent = tickets.filter(t => t.status === 'In Progress').length;
        clientResolved.textContent = tickets.filter(t => t.status === 'Resolved').length;

        let filtered = tickets;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.id.toLowerCase().includes(q) ||
                t.name.toLowerCase().includes(q) ||
                t.department.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q)
            );
        }

        clientTicketsBody.innerHTML = '';
        if (filtered.length === 0) {
            clientEmptyState.classList.add('show');
            $('#client-tickets-table').style.display = 'none';
        } else {
            clientEmptyState.classList.remove('show');
            $('#client-tickets-table').style.display = '';
            filtered.forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${t.id}</strong></td>
                    <td>${escapeHtml(t.name)}</td>
                    <td>${escapeHtml(t.department)}</td>
                    <td><span class="badge badge-${t.severity.toLowerCase()}">${t.severity}</span></td>
                    <td><span class="badge ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
                    <td>${formatDate(t.createdAt)}</td>
                `;
                tr.addEventListener('click', () => openViewModal(t.id));
                clientTicketsBody.appendChild(tr);
            });
        }
    }

    clientSearch.addEventListener('input', function () {
        renderClientTickets(this.value.trim());
    });

    // ==================== RENDER ADMIN TICKETS ====================

    function renderAdminTickets() {
        const allTickets = loadTickets();
        const searchQuery = adminSearch.value.trim().toLowerCase();
        const statusFilter = adminFilterStatus.value;
        const severityFilter = adminFilterSeverity.value;
        const deptFilter = adminFilterDept.value;

        // Update stats
        adminTotal.textContent = allTickets.length;
        adminOpen.textContent = allTickets.filter(t => t.status === 'Open').length;
        adminProgress.textContent = allTickets.filter(t => t.status === 'In Progress').length;
        adminResolved.textContent = allTickets.filter(t => t.status === 'Resolved').length;
        adminSevere.textContent = allTickets.filter(t => t.severity === 'Severe').length;

        let filtered = allTickets;
        if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter);
        if (severityFilter !== 'all') filtered = filtered.filter(t => t.severity === severityFilter);
        if (deptFilter !== 'all') filtered = filtered.filter(t => t.department === deptFilter);
        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.id.toLowerCase().includes(searchQuery) ||
                t.name.toLowerCase().includes(searchQuery) ||
                t.department.toLowerCase().includes(searchQuery) ||
                t.description.toLowerCase().includes(searchQuery) ||
                t.submittedBy.toLowerCase().includes(searchQuery)
            );
        }

        adminTicketsBody.innerHTML = '';
        if (filtered.length === 0) {
            adminEmptyState.classList.add('show');
            $('#admin-tickets-table').style.display = 'none';
        } else {
            adminEmptyState.classList.remove('show');
            $('#admin-tickets-table').style.display = '';
            filtered.forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${t.id}</strong></td>
                    <td>${escapeHtml(t.name)}</td>
                    <td>${escapeHtml(t.department)}</td>
                    <td><span class="badge badge-${t.severity.toLowerCase()}">${t.severity}</span></td>
                    <td><span class="badge ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
                    <td>${escapeHtml(t.submittedBy)}</td>
                    <td>${formatDate(t.createdAt)}</td>
                    <td>
                        <button class="btn btn-ghost btn-sm" title="View Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </td>
                `;
                tr.addEventListener('click', () => openViewModal(t.id));
                adminTicketsBody.appendChild(tr);
            });
        }
    }

    adminSearch.addEventListener('input', renderAdminTickets);
    adminFilterStatus.addEventListener('change', renderAdminTickets);
    adminFilterSeverity.addEventListener('change', renderAdminTickets);
    adminFilterDept.addEventListener('change', renderAdminTickets);

    // ==================== UTILITIES ====================

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Open': return 'badge-open';
            case 'In Progress': return 'badge-in-progress';
            case 'Resolved': return 'badge-resolved';
            case 'Closed': return 'badge-closed';
            default: return 'badge-open';
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== KEYBOARD SHORTCUTS ====================

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (ticketModal.classList.contains('show')) closeModal();
            if (viewTicketModal.classList.contains('show')) closeViewModal();
        }
    });

    // ==================== INIT ====================

    function init() {
        const session = getSession();
        if (session) {
            currentUser = session;
            if (session.role === 'admin') {
                enterAdmin();
            } else {
                enterClient();
            }
        } else {
            showScreen(loginScreen);
        }
    }

    init();

})();
