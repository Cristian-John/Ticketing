/* ===================================
   IT Support Ticketing System
   Node.js / Express Backend (TypeScript)
   =================================== */

import express, { Request, Response } from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';
import multer from 'multer';

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../uploads'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// --- Types ---
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
    createdAt: string;
    updatedAt: string;
    dueAt: string;
    notes?: Note[];
    attachments?: Attachment[];
}

interface Note {
    id: number;
    ticketId: string;
    text: string;
    author: string;
    time: string;
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

interface Attachment {
    id: string;
    ticketId: string;
    filename: string;
    originalname: string;
    size: number;
    uploadedAt: string;
}

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Database Setup ───────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, '../tickets.db'));
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
} catch (e) {
    // Column likely already exists
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string {
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
    getAllArticles: db.prepare(`SELECT * FROM articles ORDER BY updatedAt DESC`),
    getArticleById: db.prepare(`SELECT * FROM articles WHERE id = ?`),
    insertArticle: db.prepare(`
        INSERT INTO articles (id, title, content, category, author, createdAt, updatedAt)
        VALUES (@id, @title, @content, @category, @author, @createdAt, @updatedAt)
    `),
    deleteArticle: db.prepare(`DELETE FROM articles WHERE id = ?`),
    getAttachments: db.prepare(`SELECT * FROM attachments WHERE ticketId = ?`),
    insertAttachment: db.prepare(`
        INSERT INTO attachments (id, ticketId, filename, originalname, size, uploadedAt)
        VALUES (@id, @ticketId, @filename, @originalname, @size, @uploadedAt)
    `),
};

// ─── API Routes ───────────────────────────────────────────────────────────────

app.get('/api/tickets', (req: Request, res: Response) => {
    try {
        let tickets = stmts.getAllTickets.all() as Ticket[];

        // Apply query-string filters
        const { status, priority, severity, department, search } = req.query;
        if (status && status !== 'all') {
            tickets = tickets.filter(t => t.status === (status as string));
        }
        if (priority && priority !== 'all') {
            tickets = tickets.filter(t => t.priority === (priority as string));
        }
        if (severity && severity !== 'all') {
            tickets = tickets.filter(t => t.severity === (severity as string));
        }
        if (department && department !== 'all') {
            tickets = tickets.filter(t => t.department === (department as string));
        }
        if (search) {
            const q = (search as string).toLowerCase();
            tickets = tickets.filter(t =>
                t.id.toLowerCase().includes(q) ||
                t.title.toLowerCase().includes(q) ||
                t.requester.toLowerCase().includes(q) ||
                t.department.toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q)
            );
        }

        // Attach notes and attachments to each ticket
        const ticketsWithNotes = tickets.map(t => ({
            ...t,
            notes: stmts.getNotes.all(t.id) as Note[],
            attachments: stmts.getAttachments.all(t.id) as Attachment[],
        }));

        res.json(ticketsWithNotes);
    } catch (err) {
        console.error('GET /api/tickets error:', err);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

app.get('/api/tickets/:id', (req: Request, res: Response): void => {
    try {
        const ticket = stmts.getTicketById.get(req.params.id) as Ticket | undefined;
        if (!ticket) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }
        
        const responseData = {
           ...ticket,
           notes: stmts.getNotes.all(ticket.id) as Note[],
           attachments: stmts.getAttachments.all(ticket.id) as Attachment[],
        };
        
        res.json(responseData);
    } catch (err) {
        console.error('GET /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

app.post('/api/tickets', (req: Request, res: Response): void => {
    try {
        const {
            title, description = '', category = 'Other',
            department, priority = 'Medium', severity = 'Moderate',
            requester, assignee = 'Unassigned'
        } = req.body;

        if (!title || !description || !requester) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const id = `TKT-${Date.now()}`;
        const now = nowISO();
        
        let dueHours = 24;
        if (severity === 'Severe') dueHours = 2;
        else if (severity === 'High') dueHours = 4;
        else if (severity === 'Low') dueHours = 48;
        
        const dueAt = new Date(Date.now() + dueHours * 3600000).toISOString();

        const ticket: Ticket = {
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
    } catch (err) {
        console.error('POST /api/tickets error:', err);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

app.put('/api/tickets/:id', (req: Request, res: Response): void => {
    try {
        const existing = stmts.getTicketById.get(req.params.id) as Ticket | undefined;
        if (!existing) {
             res.status(404).json({ error: 'Ticket not found' });
             return;
        }

        const allowed = ['title', 'description', 'category', 'department', 'priority', 'severity', 'status', 'assignee', 'requester', 'rating', 'ratingComment'];
        const setClauses: string[] = [];
        const values: Record<string, any> = {};

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

        const updated = stmts.getTicketById.get(req.params.id) as Ticket;
        const responseData = {
           ...updated,
           notes: stmts.getNotes.all(updated.id) as Note[],
           attachments: stmts.getAttachments.all(updated.id) as Attachment[]
        };
        res.json(responseData);
    } catch (err) {
        console.error('PUT /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

app.delete('/api/tickets/:id', (req: Request, res: Response): void => {
    try {
        const existing = stmts.getTicketById.get(req.params.id) as Ticket | undefined;
        if (!existing) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }

        stmts.deleteTicket.run(req.params.id);
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('DELETE /api/tickets/:id error:', err);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

app.post('/api/tickets/:id/notes', (req: Request, res: Response): void => {
    try {
        const existing = stmts.getTicketById.get(req.params.id) as Ticket | undefined;
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
    } catch (err) {
        console.error('POST /api/tickets/:id/notes error:', err);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

app.post('/api/tickets/:id/attachments', upload.single('file'), (req: Request, res: Response): void => {
    try {
        const existing = stmts.getTicketById.get(req.params.id) as Ticket | undefined;
        if (!existing) {
             res.status(404).json({ error: 'Ticket not found' });
             return;
        }

        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const id = `ATT-${Date.now()}`;
        const attachment: Attachment = {
            id,
            ticketId: String(req.params.id),
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            uploadedAt: nowISO(),
        };

        stmts.insertAttachment.run(attachment);
        res.status(201).json(attachment);
    } catch (err) {
        console.error('POST /api/tickets/:id/attachments error:', err);
        res.status(500).json({ error: 'Failed to upload attachment' });
    }
});

app.get('/api/articles', (req: Request, res: Response) => {
    try {
        let articles = stmts.getAllArticles.all() as Article[];
        const { search } = req.query;
        if (search) {
            const q = (search as string).toLowerCase();
            articles = articles.filter(a => 
                a.title.toLowerCase().includes(q) || 
                a.content.toLowerCase().includes(q) ||
                a.category.toLowerCase().includes(q)
            );
        }
        res.json(articles);
    } catch (err) {
        console.error('GET /api/articles error:', err);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

app.get('/api/articles/:id', (req: Request, res: Response): void => {
    try {
        const article = stmts.getArticleById.get(req.params.id) as Article | undefined;
        if (!article) {
            res.status(404).json({ error: 'Article not found' });
            return;
        }
        res.json(article);
    } catch (err) {
        console.error('GET /api/articles/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});

app.post('/api/articles', (req: Request, res: Response): void => {
    try {
        const { title, content, category = 'General', author = 'Admin' } = req.body;
        if (!title || !content) {
            res.status(400).json({ error: 'Title and content required' });
            return;
        }
        
        const id = `KB-${Date.now()}`;
        const now = nowISO();
        const article: Article = { id, title, content, category, author, createdAt: now, updatedAt: now };
        
        stmts.insertArticle.run(article);
        res.status(201).json(article);
    } catch (err) {
        console.error('POST /api/articles error:', err);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

app.put('/api/articles/:id', (req: Request, res: Response): void => {
    try {
        const existing = stmts.getArticleById.get(req.params.id) as Article | undefined;
        if (!existing) {
            res.status(404).json({ error: 'Article not found' });
            return;
        }
        
        const allowed = ['title', 'content', 'category'];
        const setClauses: string[] = [];
        const values: Record<string, any> = {};
        
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
    } catch (err) {
        console.error('PUT /api/articles/:id error:', err);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

app.delete('/api/articles/:id', (req: Request, res: Response): void => {
    try {
        const existing = stmts.getArticleById.get(req.params.id) as Article | undefined;
        if (!existing) {
            res.status(404).json({ error: 'Article not found' });
            return;
        }
        
        stmts.deleteArticle.run(req.params.id);
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('DELETE /api/articles/:id error:', err);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

app.get('/api/stats', (req: Request, res: Response) => {
    try {
        const all = stmts.getAllTickets.all() as Ticket[];
        const total = all.length;
        const open = all.filter(t => t.status === 'Open').length;
        const inProgress = all.filter(t => t.status === 'In Progress').length;
        const resolved = all.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
        const severe = all.filter(t => t.severity === 'Severe' && t.status !== 'Resolved' && t.status !== 'Closed').length;
        const critical = all.filter(t => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;

        const rated = all.filter(t => t.rating !== null);
        const avgRating = rated.length ? (rated.reduce((s, t) => s + (t.rating as number), 0) / rated.length).toFixed(1) : null;

        res.json({ total, open, inProgress, resolved, severe, critical, avgRating, rated: rated.length });
    } catch (err) {
        console.error('GET /api/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ─── Catch-all: serve index.html for SPA ──────────────────────────────────────
app.get('{*path}', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  🎫  IT Support Ticketing System (TypeScript)`);
    console.log(`  ──────────────────────────────────────────`);
    console.log(`  Server running at http://localhost:${PORT}`);
    console.log(`  Database: tickets.db\n`);
});
