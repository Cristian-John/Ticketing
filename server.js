/* ===================================
   IT Support Ticketing System
   Node.js / Express Backend
   =================================== */

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database Setup ───────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'tickets.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        description TEXT DEFAULT '',
        category    TEXT DEFAULT 'Other',
        department  TEXT NOT NULL,
        priority    TEXT DEFAULT 'Medium',
        severity    TEXT DEFAULT 'Moderate',
        status      TEXT DEFAULT 'Open',
        assignee    TEXT DEFAULT 'Unassigned',
        requester   TEXT NOT NULL,
        rating      INTEGER DEFAULT NULL,
        ratingComment TEXT DEFAULT '',
        createdAt   TEXT NOT NULL,
        updatedAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        ticketId TEXT NOT NULL,
        text     TEXT NOT NULL,
        author   TEXT NOT NULL,
        time     TEXT NOT NULL,
        FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );
`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
    const now = new Date();
    const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `TKT-${y}${m}${d}-${num}`;
}

function nowISO() {
    return new Date().toISOString();
}

// Prepared statements for performance
const stmts = {
    getAllTickets: db.prepare(`SELECT * FROM tickets ORDER BY updatedAt DESC`),
    getTicketById: db.prepare(`SELECT * FROM tickets WHERE id = ?`),
    insertTicket: db.prepare(`
        INSERT INTO tickets (id, title, description, category, department, priority, severity, status, assignee, requester, rating, ratingComment, createdAt, updatedAt)
        VALUES (@id, @title, @description, @category, @department, @priority, @severity, @status, @assignee, @requester, @rating, @ratingComment, @createdAt, @updatedAt)
    `),
    deleteTicket: db.prepare(`DELETE FROM tickets WHERE id = ?`),
    getNotes: db.prepare(`SELECT * FROM notes WHERE ticketId = ? ORDER BY id ASC`),
    insertNote: db.prepare(`
        INSERT INTO notes (ticketId, text, author, time) VALUES (@ticketId, @text, @author, @time)
    `),
};

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/tickets — list all tickets (with optional filters)
app.get('/api/tickets', (req, res) => {
    try {
        let tickets = stmts.getAllTickets.all();

        // Apply query-string filters
        const { status, priority, severity, department, search } = req.query;
        if (status && status !== 'all') {
            tickets = tickets.filter(t => t.status === status);
        }
        if (priority && priority !== 'all') {
            tickets = tickets.filter(t => t.priority === priority);
        }
        if (severity && severity !== 'all') {
            tickets = tickets.filter(t => t.severity === severity);
        }
        if (department && department !== 'all') {
            tickets = tickets.filter(t => t.department === department);
        }
        if (search) {
            const q = search.toLowerCase();
            tickets = tickets.filter(t =>
                t.id.toLowerCase().includes(q) ||
                t.title.toLowerCase().includes(q) ||
                t.requester.toLowerCase().includes(q) ||
                t.department.toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q)
            );
        }

        // Attach notes to each ticket
        tickets = tickets.map(t => ({
            ...t,
            notes: stmts.getNotes.all(t.id),
        }));

        res.json(tickets);
    } catch (err) {
        console.error('GET /api/tickets error:', err);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// GET /api/tickets/:id — single ticket with notes
app.get('/api/tickets/:id', (req, res) => {
    try {
        const ticket = stmts.getTicketById.get(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        ticket.notes = stmts.getNotes.all(ticket.id);
        res.json(ticket);
    } catch (err) {
        console.error('GET /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

// POST /api/tickets — create a new ticket
app.post('/api/tickets', (req, res) => {
    try {
        const {
            title, description = '', category = 'Other',
            department, priority = 'Medium', severity = 'Moderate',
            requester, assignee = 'Unassigned'
        } = req.body;

        if (!title || !department || !requester) {
            return res.status(400).json({ error: 'Title, department, and requester are required' });
        }

        const ticket = {
            id: generateId(),
            title,
            description,
            category,
            department,
            priority,
            severity,
            status: 'Open',
            assignee,
            requester,
            rating: null,
            ratingComment: '',
            createdAt: nowISO(),
            updatedAt: nowISO(),
        };

        stmts.insertTicket.run(ticket);
        ticket.notes = [];
        res.status(201).json(ticket);
    } catch (err) {
        console.error('POST /api/tickets error:', err);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

// PUT /api/tickets/:id — update a ticket
app.put('/api/tickets/:id', (req, res) => {
    try {
        const existing = stmts.getTicketById.get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Ticket not found' });

        const allowed = ['title', 'description', 'category', 'department', 'priority', 'severity', 'status', 'assignee', 'requester', 'rating', 'ratingComment'];
        const setClauses = [];
        const values = {};

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                setClauses.push(`${key} = @${key}`);
                values[key] = req.body[key];
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        setClauses.push('updatedAt = @updatedAt');
        values.updatedAt = nowISO();
        values.id = req.params.id;

        const sql = `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = @id`;
        db.prepare(sql).run(values);

        const updated = stmts.getTicketById.get(req.params.id);
        updated.notes = stmts.getNotes.all(updated.id);
        res.json(updated);
    } catch (err) {
        console.error('PUT /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

// DELETE /api/tickets/:id — delete a ticket
app.delete('/api/tickets/:id', (req, res) => {
    try {
        const existing = stmts.getTicketById.get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Ticket not found' });

        stmts.deleteTicket.run(req.params.id);
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('DELETE /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

// POST /api/tickets/:id/notes — add a note
app.post('/api/tickets/:id/notes', (req, res) => {
    try {
        const existing = stmts.getTicketById.get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Ticket not found' });

        const { text, author } = req.body;
        if (!text || !author) {
            return res.status(400).json({ error: 'Text and author are required' });
        }

        const note = {
            ticketId: req.params.id,
            text,
            author,
            time: new Date().toLocaleString(),
        };

        const result = stmts.insertNote.run(note);

        // Update ticket's updatedAt
        db.prepare('UPDATE tickets SET updatedAt = ? WHERE id = ?').run(nowISO(), req.params.id);

        res.status(201).json({ id: result.lastInsertRowid, ...note });
    } catch (err) {
        console.error('POST /api/tickets/:id/notes error:', err);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

// GET /api/stats — dashboard statistics
app.get('/api/stats', (req, res) => {
    try {
        const all = stmts.getAllTickets.all();
        const total = all.length;
        const open = all.filter(t => t.status === 'Open').length;
        const inProgress = all.filter(t => t.status === 'In Progress').length;
        const resolved = all.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
        const severe = all.filter(t => t.severity === 'Severe' && t.status !== 'Resolved' && t.status !== 'Closed').length;
        const critical = all.filter(t => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;

        const rated = all.filter(t => t.rating !== null);
        const avgRating = rated.length ? (rated.reduce((s, t) => s + t.rating, 0) / rated.length).toFixed(1) : null;

        res.json({ total, open, inProgress, resolved, severe, critical, avgRating, rated: rated.length });
    } catch (err) {
        console.error('GET /api/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ─── Catch-all: serve index.html for SPA ──────────────────────────────────────
app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  🎫  IT Support Ticketing System`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  Server running at http://localhost:${PORT}`);
    console.log(`  Database: tickets.db\n`);
});
