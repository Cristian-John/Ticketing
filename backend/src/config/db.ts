import { Pool } from 'pg';
import { ENV } from './env';
import bcrypt from 'bcryptjs';

const pool = new Pool({
    connectionString: ENV.DATABASE_URL
});

export const db = {
    pool,
    // Helper to query with named parameter support (converting @name -> $1, $2, etc.)
    async query(sql: string, params?: any) {
        if (!params) {
            return pool.query(sql);
        }
        if (Array.isArray(params)) {
            // Swap standard ? placeholders to $1, $2, etc.
            let index = 1;
            const rewrittenSql = sql.replace(/\?/g, () => `$${index++}`);
            return pool.query(rewrittenSql, params);
        }
        
        const placeholders: string[] = [];
        const regex = /@([a-zA-Z0-9_]+)/g;
        let index = 1;
        const values: any[] = [];
        
        const rewrittenSql = sql.replace(regex, (m, name) => {
            placeholders.push(name);
            values.push(params[name]);
            return `$${index++}`;
        });
        
        return pool.query(rewrittenSql, values);
    }
};

// Seed default admin account if not exists
export async function seedAdmin(): Promise<void> {
    try {
        const adminRes = await db.query('SELECT 1 FROM users WHERE role = $1', ['admin']);
        if (adminRes.rowCount === 0) {
            const adminId = 'USR-admin';
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(ENV.ADMIN_PASSWORD, salt);
            const now = new Date().toISOString();
            await db.query(`
                INSERT INTO users (id, username, "fullName", email, password, role, active, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)
            `, [adminId, 'admin', 'System Administrator', 'admin@support.com', hashedPassword, 'admin', now, now]);
            console.log('[Database] Default admin account seeded.');
        }
    } catch (err) {
        console.error('Failed to seed default admin:', err);
    }
}

// In server.ts or on application startup, seed admin is called
seedAdmin().catch(console.error);

export default db;
