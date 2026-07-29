import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        console.log('Running migrations...');
        
        // 1. Add Unique constraint to ticket_collaborators if not exists
        try {
            await pool.query(`
                ALTER TABLE ticket_collaborators 
                ADD CONSTRAINT unique_ticket_collaborator UNIQUE (ticket_id, user_id);
            `);
            console.log('Added unique constraint to ticket_collaborators');
        } catch (e: any) {
            console.log('Unique constraint already exists or failed:', e.message);
        }

        // 2. Create ticket_collaboration_requests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_collaboration_requests (
                id UUID PRIMARY KEY,
                ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                requester_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                approver_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
                responded_at TIMESTAMPTZ,
                rejection_reason TEXT,
                cancelled_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Created ticket_collaboration_requests table');

        // 3. Add target_user_id to ticket_collaboration_requests if not exists
        try {
            await pool.query(`
                ALTER TABLE ticket_collaboration_requests 
                ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE;
            `);
            console.log('Added target_user_id to ticket_collaboration_requests');
        } catch (e: any) {
            console.log('Failed to add target_user_id column:', e.message);
        }

        // 4. Create partial unique index
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_collab_req 
            ON ticket_collaboration_requests (ticket_id, requester_id) 
            WHERE status = 'pending';
        `);
        console.log('Created partial unique index for pending requests');

        // 5. Create notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(50) PRIMARY KEY,
                recipient_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                actor_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
                type VARCHAR(50) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                metadata JSONB,
                read_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Created notifications table');

        // 6. Create index on recipient_id
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id 
            ON notifications (recipient_id);
        `);
        console.log('Created index on notifications.recipient_id');

        // 7. Create ticket_transfer_requests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_transfer_requests (
                id UUID PRIMARY KEY,
                ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                requester_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                target_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                rejection_reason TEXT,
                responded_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Created ticket_transfer_requests table');

        // 8. Create partial unique index to allow only one pending transfer per ticket
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_transfer_req 
            ON ticket_transfer_requests (ticket_id) 
            WHERE status = 'pending';
        `);
        console.log('Created partial unique index for pending transfer requests');

    } catch (e: any) {
        console.error('Migration failed', e);
    } finally {
        await pool.end();
    }
}

run();
