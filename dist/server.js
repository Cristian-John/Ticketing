"use strict";
/* ===================================
   IT Support Ticketing System
   Node.js / Express Backend (TypeScript)
   =================================== */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env file
dotenv.config();
const storage = multer_1.default.diskStorage({
    destination: path_1.default.join(__dirname, '../uploads'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ─── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ─── Database Setup ───────────────────────────────────────────────────────────
const dbPath = process.env.DB_PATH || path_1.default.join(__dirname, '../tickets.db');
const db = new better_sqlite3_1.default(dbPath);
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

    CREATE TABLE IF NOT EXISTS articles (
        id       TEXT PRIMARY KEY,
        title    TEXT NOT NULL,
        content  TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        author   TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
        id           TEXT PRIMARY KEY,
        ticketId     TEXT NOT NULL,
        filename     TEXT NOT NULL,
        originalname TEXT NOT NULL,
        size         INTEGER NOT NULL,
        uploadedAt   TEXT NOT NULL,
        FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );
`);
try {
    // Add dueAt column for SLA Tracking if it doesn't already exist
    db.exec('ALTER TABLE tickets ADD COLUMN dueAt TEXT DEFAULT ""');
}
catch (e) {
    // Column likely already exists
}
try {
    // Add ratingRequested column for prompting users to rate resolved tickets
    db.exec('ALTER TABLE tickets ADD COLUMN ratingRequested INTEGER DEFAULT 0');
}
catch (e) {
    // Column likely already exists
}
try {
    // Add sortOrder column for article ordering
    db.exec('ALTER TABLE articles ADD COLUMN sortOrder INTEGER DEFAULT 0');
    // Set initial sort order based on existing rows
    const existingArticles = db.prepare('SELECT id FROM articles ORDER BY updatedAt DESC').all();
    existingArticles.forEach((a, i) => {
        db.prepare('UPDATE articles SET sortOrder = ? WHERE id = ?').run(i, a.id);
    });
}
catch (e) {
    // Column likely already exists
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
    const now = new Date();
    const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `TKT-${y}${m}${d}-${num}`;
}
const nowISO = () => new Date().toISOString();
// Prepared statements for performance
const stmts = {
    getAllTickets: db.prepare(`SELECT * FROM tickets ORDER BY createdAt DESC`),
    getTicketById: db.prepare(`SELECT * FROM tickets WHERE id = ?`),
    insertTicket: db.prepare(`
        INSERT INTO tickets (id, title, description, category, department, priority, severity, status, assignee, requester, rating, ratingComment, createdAt, updatedAt, dueAt)
        VALUES (@id, @title, @description, @category, @department, @priority, @severity, @status, @assignee, @requester, @rating, @ratingComment, @createdAt, @updatedAt, @dueAt)
    `),
    deleteTicket: db.prepare(`DELETE FROM tickets WHERE id = ?`),
    getNotes: db.prepare(`SELECT * FROM notes WHERE ticketId = ? ORDER BY id ASC`),
    insertNote: db.prepare(`
        INSERT INTO notes (ticketId, text, author, time) VALUES (@ticketId, @text, @author, @time)
    `),
    getAllArticles: db.prepare(`SELECT * FROM articles ORDER BY sortOrder ASC, updatedAt DESC`),
    getArticleById: db.prepare(`SELECT * FROM articles WHERE id = ?`),
    getMaxSortOrder: db.prepare(`SELECT COALESCE(MAX(sortOrder), -1) as maxOrder FROM articles`),
    insertArticle: db.prepare(`
        INSERT INTO articles (id, title, content, category, author, createdAt, updatedAt, sortOrder)
        VALUES (@id, @title, @content, @category, @author, @createdAt, @updatedAt, @sortOrder)
    `),
    deleteArticle: db.prepare(`DELETE FROM articles WHERE id = ?`),
    getAttachments: db.prepare(`SELECT * FROM attachments WHERE ticketId = ?`),
    insertAttachment: db.prepare(`
        INSERT INTO attachments (id, ticketId, filename, originalname, size, uploadedAt)
        VALUES (@id, @ticketId, @filename, @originalname, @size, @uploadedAt)
    `),
};
// ─── API Routes ───────────────────────────────────────────────────────────────
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
            tickets = tickets.filter(t => t.id.toLowerCase().includes(q) ||
                t.title.toLowerCase().includes(q) ||
                t.requester.toLowerCase().includes(q) ||
                t.department.toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q));
        }
        // Attach notes and attachments to each ticket
        const ticketsWithNotes = tickets.map(t => ({
            ...t,
            notes: stmts.getNotes.all(t.id),
            attachments: stmts.getAttachments.all(t.id),
        }));
        res.json(ticketsWithNotes);
    }
    catch (err) {
        console.error('GET /api/tickets error:', err);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});
app.get('/api/tickets/:id', (req, res) => {
    try {
        const ticket = stmts.getTicketById.get(req.params.id);
        if (!ticket) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }
        const responseData = {
            ...ticket,
            notes: stmts.getNotes.all(ticket.id),
            attachments: stmts.getAttachments.all(ticket.id),
        };
        res.json(responseData);
    }
    catch (err) {
        console.error('GET /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});
app.post('/api/tickets', (req, res) => {
    try {
        const { title, description = '', category = 'Other', department, priority = 'Medium', severity = 'Moderate', requester, assignee = 'Unassigned' } = req.body;
        if (!title || !description || !requester) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const id = `TKT-${Date.now()}`;
        const now = nowISO();
        let dueHours = 24;
        if (severity === 'Severe')
            dueHours = 2;
        else if (severity === 'High')
            dueHours = 4;
        else if (severity === 'Low')
            dueHours = 48;
        const dueAt = new Date(Date.now() + dueHours * 3600000).toISOString();
        const ticket = {
            id, requester, department, category, title, description,
            status: 'Open', priority, severity,
            rating: null,
            ratingComment: null,
            createdAt: now,
            updatedAt: now,
            dueAt,
            assignee: assignee || 'Unassigned',
        };
        stmts.insertTicket.run(ticket);
        res.status(201).json({ ...ticket, notes: [], attachments: [] });
    }
    catch (err) {
        console.error('POST /api/tickets error:', err);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});
app.put('/api/tickets/:id', (req, res) => {
    try {
        const existing = stmts.getTicketById.get(req.params.id);
        if (!existing) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }
        const allowed = ['title', 'description', 'category', 'department', 'priority', 'severity', 'status', 'assignee', 'requester', 'rating', 'ratingComment', 'dueAt', 'ratingRequested'];
        const setClauses = [];
        const values = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                setClauses.push(`${key} = @${key}`);
                values[key] = req.body[key];
            }
        }
        if (setClauses.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }
        setClauses.push('updatedAt = @updatedAt');
        values.updatedAt = nowISO();
        values.id = req.params.id;
        const sql = `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = @id`;
        db.prepare(sql).run(values);
        const updated = stmts.getTicketById.get(req.params.id);
        const responseData = {
            ...updated,
            notes: stmts.getNotes.all(updated.id),
            attachments: stmts.getAttachments.all(updated.id)
        };
        res.json(responseData);
    }
    catch (err) {
        console.error('PUT /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});
app.delete('/api/tickets/:id', (req, res) => {
    try {
        const existing = stmts.getTicketById.get(req.params.id);
        if (!existing) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }
        stmts.deleteTicket.run(req.params.id);
        res.json({ success: true, id: req.params.id });
    }
    catch (err) {
        console.error('DELETE /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});
app.post('/api/tickets/:id/notes', (req, res) => {
    try {
        const existing = stmts.getTicketById.get(req.params.id);
        if (!existing) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }
        const { text, author } = req.body;
        if (!text || !author) {
            res.status(400).json({ error: 'Text and author are required' });
            return;
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
    }
    catch (err) {
        console.error('POST /api/tickets/:id/notes error:', err);
        res.status(500).json({ error: 'Failed to add note' });
    }
});
app.post('/api/tickets/:id/attachments', upload.single('file'), (req, res) => {
    try {
        const existing = stmts.getTicketById.get(req.params.id);
        if (!existing) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const id = `ATT-${Date.now()}`;
        const attachment = {
            id,
            ticketId: String(req.params.id),
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            uploadedAt: nowISO(),
        };
        stmts.insertAttachment.run(attachment);
        res.status(201).json(attachment);
    }
    catch (err) {
        console.error('POST /api/tickets/:id/attachments error:', err);
        res.status(500).json({ error: 'Failed to upload attachment' });
    }
});
app.get('/api/articles', (req, res) => {
    try {
        let articles = stmts.getAllArticles.all();
        const { search } = req.query;
        if (search) {
            const q = search.toLowerCase();
            articles = articles.filter(a => a.title.toLowerCase().includes(q) ||
                a.content.toLowerCase().includes(q) ||
                a.category.toLowerCase().includes(q));
        }
        res.json(articles);
    }
    catch (err) {
        console.error('GET /api/articles error:', err);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});
app.get('/api/articles/:id', (req, res) => {
    try {
        const article = stmts.getArticleById.get(req.params.id);
        if (!article) {
            res.status(404).json({ error: 'Article not found' });
            return;
        }
        res.json(article);
    }
    catch (err) {
        console.error('GET /api/articles/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});
app.post('/api/articles', (req, res) => {
    try {
        const { title, content, category = 'General', author = 'Admin' } = req.body;
        if (!title || !content) {
            res.status(400).json({ error: 'Title and content required' });
            return;
        }
        const id = `KB-${Date.now()}`;
        const now = nowISO();
        const { maxOrder } = stmts.getMaxSortOrder.get();
        const article = { id, title, content, category, author, createdAt: now, updatedAt: now, sortOrder: maxOrder + 1 };
        stmts.insertArticle.run(article);
        res.status(201).json(article);
    }
    catch (err) {
        console.error('POST /api/articles error:', err);
        res.status(500).json({ error: 'Failed to create article' });
    }
});
// Reorder articles (must be before :id route)
app.put('/api/articles/reorder', (req, res) => {
    try {
        const { order } = req.body; // array of article IDs in desired order
        if (!Array.isArray(order)) {
            res.status(400).json({ error: 'order must be an array of article IDs' });
            return;
        }
        const updateSort = db.prepare('UPDATE articles SET sortOrder = ? WHERE id = ?');
        const reorderAll = db.transaction((ids) => {
            ids.forEach((id, index) => updateSort.run(index, id));
        });
        reorderAll(order);
        res.json({ success: true });
    }
    catch (err) {
        console.error('PUT /api/articles/reorder error:', err);
        res.status(500).json({ error: 'Failed to reorder articles' });
    }
});
app.put('/api/articles/:id', (req, res) => {
    try {
        const existing = stmts.getArticleById.get(req.params.id);
        if (!existing) {
            res.status(404).json({ error: 'Article not found' });
            return;
        }
        const allowed = ['title', 'content', 'category'];
        const setClauses = [];
        const values = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                setClauses.push(`${key} = @${key}`);
                values[key] = req.body[key];
            }
        }
        if (setClauses.length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }
        setClauses.push('updatedAt = @updatedAt');
        values.updatedAt = nowISO();
        values.id = req.params.id;
        db.prepare(`UPDATE articles SET ${setClauses.join(', ')} WHERE id = @id`).run(values);
        res.json(stmts.getArticleById.get(req.params.id));
    }
    catch (err) {
        console.error('PUT /api/articles/:id error:', err);
        res.status(500).json({ error: 'Failed to update article' });
    }
});
app.delete('/api/articles/:id', (req, res) => {
    try {
        const existing = stmts.getArticleById.get(req.params.id);
        if (!existing) {
            res.status(404).json({ error: 'Article not found' });
            return;
        }
        stmts.deleteArticle.run(req.params.id);
        res.json({ success: true, id: req.params.id });
    }
    catch (err) {
        console.error('DELETE /api/articles/:id error:', err);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});
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
    }
    catch (err) {
        console.error('GET /api/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
// ─── Auth API ─────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const { role, password } = req.body;
    if (role === 'admin') {
        const truePassword = process.env.ADMIN_PASSWORD || '@inspireSupport';
        if (password === truePassword) {
            res.json({ success: true, message: 'Authenticated' });
        }
        else {
            res.status(401).json({ error: 'Incorrect admin password' });
        }
    }
    else {
        // Client login doesn't require password currently
        res.json({ success: true, message: 'Authenticated' });
    }
});
// ─── Catch-all: serve index.html for SPA ──────────────────────────────────────
app.get('{*path}', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public', 'index.html'));
});
// ─── Tickets API ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  🎫  IT Support Ticketing System (TypeScript)`);
    console.log(`  ──────────────────────────────────────────`);
    console.log(`  Server running at http://localhost:${PORT}`);
    console.log(`  Database: tickets.db\n`);
});
