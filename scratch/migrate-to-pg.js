const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or root .env
const backendEnvPath = path.join(__dirname, '../backend/.env');
const rootEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
    console.log('[Migration] Loaded env from backend/.env');
} else if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
    console.log('[Migration] Loaded env from root .env');
} else {
    console.log('[Migration] No .env file found. Proceeding with process.env variables.');
}

const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'attachment';

if (!DATABASE_URL) {
    console.error('[Error] DATABASE_URL is not set in environment.');
    process.exit(1);
}

const sqliteDbPath = path.join(__dirname, '../tickets.db');
if (!fs.existsSync(sqliteDbPath)) {
    console.error(`[Error] SQLite database not found at ${sqliteDbPath}`);
    process.exit(1);
}

console.log(`[Migration] Connecting to SQLite: ${sqliteDbPath}`);
const sqliteDb = new Database(sqliteDbPath);

console.log('[Migration] Connecting to PostgreSQL...');
const pgClient = new Client({ connectionString: DATABASE_URL });

async function run() {
    await pgClient.connect();
    console.log('[Migration] Connected to PostgreSQL.');

    let supabase = null;
    if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
        console.log(`[Migration] Initializing Supabase client: ${SUPABASE_URL}`);
        supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
    } else {
        console.log('[Migration] SUPABASE_URL or SUPABASE_SECRET_KEY is missing. Skipping storage setup.');
    }

    // 1. Create tables if they do not exist (DDL Migration)
    console.log('[Migration] Initializing DDL Schema...');
    
    await pgClient.query(`
        CREATE TABLE IF NOT EXISTS users (
            "id"        VARCHAR PRIMARY KEY,
            "username"  VARCHAR NOT NULL UNIQUE,
            "fullName"  VARCHAR NOT NULL,
            "email"     VARCHAR NOT NULL UNIQUE,
            "password"  VARCHAR NOT NULL,
            "role"      VARCHAR NOT NULL DEFAULT 'client',
            "active"    INTEGER NOT NULL DEFAULT 1,
            "createdAt" TIMESTAMPTZ NOT NULL,
            "updatedAt" TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tickets (
            "id"              VARCHAR PRIMARY KEY,
            "title"           VARCHAR NOT NULL,
            "description"     TEXT DEFAULT '',
            "category"        VARCHAR DEFAULT 'Other',
            "department"      VARCHAR NOT NULL,
            "priority"        VARCHAR DEFAULT 'Medium',
            "severity"        VARCHAR DEFAULT 'Moderate',
            "status"          VARCHAR DEFAULT 'Open',
            "assignee"        VARCHAR DEFAULT 'Unassigned',
            "requester"       VARCHAR NOT NULL,
            "rating"          INTEGER DEFAULT NULL,
            "ratingComment"   TEXT DEFAULT '',
            "createdAt"       TIMESTAMPTZ NOT NULL,
            "updatedAt"       TIMESTAMPTZ NOT NULL,
            "dueAt"           TIMESTAMPTZ DEFAULT NULL,
            "ratingRequested" INTEGER DEFAULT 0,
            "userId"          VARCHAR DEFAULT NULL REFERENCES users("id") ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            "id"        VARCHAR PRIMARY KEY,
            "userId"    VARCHAR NOT NULL REFERENCES users("id") ON DELETE CASCADE,
            "expiresAt" TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notes (
            "id"       SERIAL PRIMARY KEY,
            "ticketId" VARCHAR NOT NULL REFERENCES tickets("id") ON DELETE CASCADE,
            "text"     TEXT NOT NULL,
            "author"   VARCHAR NOT NULL,
            "time"     TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE IF NOT EXISTS articles (
            "id"        VARCHAR PRIMARY KEY,
            "title"     VARCHAR NOT NULL,
            "content"   TEXT NOT NULL,
            "category"  VARCHAR DEFAULT 'General',
            "author"    VARCHAR NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL,
            "updatedAt" TIMESTAMPTZ NOT NULL,
            "sortOrder" INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS attachments (
            "id"           VARCHAR PRIMARY KEY,
            "ticketId"     VARCHAR NOT NULL REFERENCES tickets("id") ON DELETE CASCADE,
            "filename"     VARCHAR NOT NULL,
            "originalname" VARCHAR NOT NULL,
            "size"         BIGINT NOT NULL,
            "uploadedAt"   TIMESTAMPTZ NOT NULL
        );

        -- Performance Indexes
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets("status");
        CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets("assignee");
        CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets("requester");
        CREATE INDEX IF NOT EXISTS idx_tickets_userid ON tickets("userId");
        CREATE INDEX IF NOT EXISTS idx_sessions_userid ON sessions("userId");
        CREATE INDEX IF NOT EXISTS idx_notes_ticketid ON notes("ticketId");
        CREATE INDEX IF NOT EXISTS idx_attachments_ticketid ON attachments("ticketId");
        CREATE INDEX IF NOT EXISTS idx_articles_sortorder ON articles("sortOrder");
    `);
    console.log('[Migration] Database tables and indexes verified.');

    // 2. Initialize storage bucket programmatically
    if (supabase) {
        console.log(`[Migration] Initializing Supabase Storage bucket: ${SUPABASE_STORAGE_BUCKET}`);
        try {
            const { data: bucketData, error: bucketError } = await supabase.storage.createBucket(SUPABASE_STORAGE_BUCKET, {
                public: true
            });
            if (bucketError) {
                console.log(`[Migration] Bucket verify/status: ${bucketError.message}`);
            } else {
                console.log(`[Migration] Bucket "${SUPABASE_STORAGE_BUCKET}" created successfully.`);
            }
        } catch (e) {
            console.log(`[Migration] Storage bucket setup warning: ${e.message}`);
        }
    }

    // Truncate existing Postgres data to start clean
    console.log('[Migration] Cleaning target PostgreSQL tables (TRUNCATE)...');
    await pgClient.query('TRUNCATE TABLE users, tickets, sessions, notes, articles, attachments CASCADE');

    // 1. Migrate Users
    console.log('[Migration] Migrating Users...');
    const users = sqliteDb.prepare('SELECT * FROM users').all();
    const validUserIds = new Set(users.map(u => u.id));
    for (const u of users) {
        await pgClient.query(`
            INSERT INTO users (id, username, "fullName", email, password, role, active, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            u.id,
            u.username,
            u.fullName,
            u.email,
            u.password,
            u.role,
            u.active,
            new Date(u.createdAt),
            new Date(u.updatedAt)
        ]);
    }

    // 2. Migrate Articles
    console.log('[Migration] Migrating Articles...');
    const articles = sqliteDb.prepare('SELECT * FROM articles').all();
    for (const a of articles) {
        await pgClient.query(`
            INSERT INTO articles (id, title, content, category, author, "createdAt", "updatedAt", "sortOrder")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            a.id,
            a.title,
            a.content,
            a.category,
            a.author,
            new Date(a.createdAt),
            new Date(a.updatedAt),
            a.sortOrder || 0
        ]);
    }

    // 3. Migrate Tickets
    console.log('[Migration] Migrating Tickets...');
    const tickets = sqliteDb.prepare('SELECT * FROM tickets').all();
    const validTicketIds = new Set(tickets.map(t => t.id));
    let ticketOrphanedUserCount = 0;
    
    for (const t of tickets) {
        // Enforce referential integrity: if t.userId refers to a non-existent user, set to null
        let validatedUserId = t.userId || null;
        if (validatedUserId && !validUserIds.has(validatedUserId)) {
            validatedUserId = null;
            ticketOrphanedUserCount++;
        }

        await pgClient.query(`
            INSERT INTO tickets (id, title, description, category, department, priority, severity, status, assignee, requester, rating, "ratingComment", "createdAt", "updatedAt", "dueAt", "ratingRequested", "userId")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
            t.id,
            t.title,
            t.description || '',
            t.category || 'Other',
            t.department,
            t.priority || 'Medium',
            t.severity || 'Moderate',
            t.status || 'Open',
            t.assignee || 'Unassigned',
            t.requester,
            t.rating,
            t.ratingComment || '',
            new Date(t.createdAt),
            new Date(t.updatedAt),
            t.dueAt ? new Date(t.dueAt) : null,
            t.ratingRequested || 0,
            validatedUserId
        ]);
    }

    // 4. Migrate Sessions
    console.log('[Migration] Migrating Sessions...');
    const sessions = sqliteDb.prepare('SELECT * FROM sessions').all();
    let sessionOrphanedCount = 0;
    for (const s of sessions) {
        if (!validUserIds.has(s.userId)) {
            sessionOrphanedCount++;
            continue;
        }

        await pgClient.query(`
            INSERT INTO sessions (id, "userId", "expiresAt")
            VALUES ($1, $2, $3)
        `, [
            s.id,
            s.userId,
            new Date(s.expiresAt)
        ]);
    }

    // 5. Migrate Notes
    console.log('[Migration] Migrating Notes...');
    const notes = sqliteDb.prepare('SELECT * FROM notes').all();
    let noteOrphanedCount = 0;
    let notesInsertedCount = 0;
    
    for (const n of notes) {
        if (!validTicketIds.has(n.ticketId)) {
            noteOrphanedCount++;
            continue;
        }

        let timeParsed;
        try {
            timeParsed = new Date(n.time);
            if (isNaN(timeParsed.getTime())) {
                timeParsed = new Date();
            }
        } catch(e) {
            timeParsed = new Date();
        }
        
        await pgClient.query(`
            INSERT INTO notes (id, "ticketId", text, author, time)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            n.id,
            n.ticketId,
            n.text,
            n.author,
            timeParsed
        ]);
        notesInsertedCount++;
    }

    // Reset notes serial sequence to max id so next inserts don't fail
    if (notesInsertedCount > 0) {
        await pgClient.query(`SELECT setval(pg_get_serial_sequence('notes', 'id'), COALESCE(max(id), 1)) FROM notes`);
    }

    // 6. Migrate Attachments
    console.log('[Migration] Migrating Attachments...');
    const attachments = sqliteDb.prepare('SELECT * FROM attachments').all();
    let attachmentOrphanedCount = 0;
    let attachmentsInsertedCount = 0;
    
    for (const att of attachments) {
        if (!validTicketIds.has(att.ticketId)) {
            attachmentOrphanedCount++;
            continue;
        }

        await pgClient.query(`
            INSERT INTO attachments (id, "ticketId", filename, originalname, size, "uploadedAt")
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            att.id,
            att.ticketId,
            att.filename,
            att.originalname,
            att.size,
            new Date(att.uploadedAt)
        ]);
        attachmentsInsertedCount++;
    }

    // 7. Upload physical file assets to Supabase Storage
    let fileUploadedCount = 0;
    const uploadsDir = path.join(__dirname, '../uploads');
    if (supabase && fs.existsSync(uploadsDir)) {
        console.log('[Migration] Scanning uploads directory for file transfers...');
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            if (fs.lstatSync(filePath).isFile()) {
                console.log(`[Migration] Uploading file to Supabase Storage: ${file}`);
                const fileBuffer = fs.readFileSync(filePath);
                
                // Upload file to Supabase Bucket
                const { error } = await supabase.storage
                    .from(SUPABASE_STORAGE_BUCKET)
                    .upload(file, fileBuffer, {
                        upsert: true
                    });

                if (error) {
                    console.error(`[Warning] Failed to upload ${file} to Supabase Storage: ${error.message}`);
                } else {
                    console.log(`[Migration] Successfully uploaded: ${file}`);
                    fileUploadedCount++;
                }
            }
        }
    }

    // 8. Verification & Record Cnt Compare
    console.log('\n==================================================');
    console.log('            MIGRATION RECORD COUNT VERIFICATION');
    console.log('==================================================');
    
    const tableCompare = [
        { name: 'users', sqlite: users.length, pgExpected: users.length },
        { name: 'articles', sqlite: articles.length, pgExpected: articles.length },
        { name: 'tickets', sqlite: tickets.length, pgExpected: tickets.length },
        { name: 'sessions', sqlite: sessions.length, pgExpected: sessions.length - sessionOrphanedCount },
        { name: 'notes', sqlite: notes.length, pgExpected: notesInsertedCount },
        { name: 'attachments', sqlite: attachments.length, pgExpected: attachmentsInsertedCount }
    ];
    
    let verificationPassed = true;

    for (const tbl of tableCompare) {
        const pgRes = await pgClient.query(`SELECT COUNT(*) as count FROM ${tbl.name}`);
        const pgCnt = parseInt(pgRes.rows[0].count, 10);
        
        const status = tbl.pgExpected === pgCnt ? '✅ PASS' : '❌ FAIL';
        if (tbl.pgExpected !== pgCnt) verificationPassed = false;
        
        console.log(`Table "${tbl.name}":`);
        console.log(`  - SQLite Source:       ${tbl.sqlite}`);
        console.log(`  - PostgreSQL Migrated: ${pgCnt} (Expected: ${tbl.pgExpected})`);
        console.log(`  - Status:              ${status}\n`);
    }

    console.log(`Files Migrated: ${fileUploadedCount}`);
    if (ticketOrphanedUserCount > 0) {
        console.log(`[Notice] Cleaned up ${ticketOrphanedUserCount} ticket references to non-existent users.`);
    }
    if (sessionOrphanedCount > 0) {
        console.log(`[Notice] Cleaned up ${sessionOrphanedCount} orphaned sessions.`);
    }
    if (noteOrphanedCount > 0) {
        console.log(`[Notice] Cleaned up ${noteOrphanedCount} orphaned notes.`);
    }
    if (attachmentOrphanedCount > 0) {
        console.log(`[Notice] Cleaned up ${attachmentOrphanedCount} orphaned attachments.`);
    }
    console.log('==================================================\n');

    if (verificationPassed) {
        console.log('🎉 Verification PASSED: All record counts match perfectly.');
    } else {
        console.error('❌ Verification FAILED: Record count mismatch detected.');
        process.exit(1);
    }
}

run()
    .catch(err => {
        console.error('[Error] Migration script failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        sqliteDb.close();
        await pgClient.end();
    });
