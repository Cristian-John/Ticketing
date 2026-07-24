import Database from 'better-sqlite3';
import { ENV } from './env';
import bcrypt from 'bcryptjs';

const db = new Database(ENV.DB_PATH);

// Configure SQLite pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        description   TEXT DEFAULT '',
        category      TEXT DEFAULT 'Other',
        department    TEXT NOT NULL,
        priority      TEXT DEFAULT 'Medium',
        severity      TEXT DEFAULT 'Moderate',
        status        TEXT DEFAULT 'Open',
        assignee      TEXT DEFAULT 'Unassigned',
        requester     TEXT NOT NULL,
        rating        INTEGER DEFAULT NULL,
        ratingComment TEXT DEFAULT '',
        createdAt     TEXT NOT NULL,
        updatedAt     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
        id        TEXT PRIMARY KEY,
        username  TEXT NOT NULL UNIQUE,
        fullName  TEXT NOT NULL,
        email     TEXT NOT NULL UNIQUE,
        password  TEXT NOT NULL,
        role      TEXT NOT NULL DEFAULT 'client',
        active    INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id        TEXT PRIMARY KEY,
        userId    TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
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
        id        TEXT PRIMARY KEY,
        title     TEXT NOT NULL,
        content   TEXT NOT NULL,
        category  TEXT DEFAULT 'General',
        author    TEXT NOT NULL,
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

// Safe migration checks for schema updates
try {
    // Add dueAt column for SLA Tracking if it doesn't already exist
    db.exec('ALTER TABLE tickets ADD COLUMN dueAt TEXT DEFAULT ""');
} catch (e) {
    // Column likely already exists
}

try {
    // Add ratingRequested column for prompting users to rate resolved tickets
    db.exec('ALTER TABLE tickets ADD COLUMN ratingRequested INTEGER DEFAULT 0');
} catch (e) {
    // Column likely already exists
}

try {
    // Add sortOrder column for article ordering
    db.exec('ALTER TABLE articles ADD COLUMN sortOrder INTEGER DEFAULT 0');
    // Set initial sort order based on existing rows if not already populated
    const existingArticles = db.prepare('SELECT id FROM articles ORDER BY updatedAt DESC').all() as { id: string }[];
    existingArticles.forEach((a, i) => {
        db.prepare('UPDATE articles SET sortOrder = ? WHERE id = ?').run(i, a.id);
    });
} catch (e) {
    // Column likely already exists
}

try {
    // Add userId column for User Account tracking if it doesn't already exist
    db.exec('ALTER TABLE tickets ADD COLUMN userId TEXT DEFAULT NULL');
} catch (e) {
    // Column likely already exists
}

try {
    // Seed default admin account
    const adminExists = db.prepare('SELECT 1 FROM users WHERE role = ?').get('admin');
    if (!adminExists) {
        const adminId = 'USR-admin';
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(ENV.ADMIN_PASSWORD, salt);
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO users (id, username, fullName, email, password, role, active, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).run(adminId, 'admin', 'System Administrator', 'admin@support.com', hashedPassword, 'admin', now, now);
        console.log('[Database] Default admin account seeded.');
    }
} catch (err) {
    console.error('Failed to seed default admin:', err);
}

try {
    // Run one-time ticket migration to match requester to userId
    const unmigratedTickets = db.prepare('SELECT id, requester FROM tickets WHERE userId IS NULL').all() as { id: string, requester: string }[];
    if (unmigratedTickets.length > 0) {
        let matchedCount = 0;
        let orphanedCount = 0;
        
        for (const t of unmigratedTickets) {
            const userMatch = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').all(t.requester) as { id: string }[];
            if (userMatch.length === 1) {
                db.prepare('UPDATE tickets SET userId = ? WHERE id = ?').run(userMatch[0].id, t.id);
                matchedCount++;
            } else {
                orphanedCount++;
            }
        }
        if (matchedCount > 0 || orphanedCount > 0) {
            console.log(`[Database] Data migration: matched ${matchedCount} tickets to user accounts, ${orphanedCount} tickets left orphaned (requester preserved).`);
        }
    }
} catch (err) {
    console.error('Failed to run tickets data migration:', err);
}

console.log('[Database] Connection initialized and schemas validated.');

export default db;
export { db };
