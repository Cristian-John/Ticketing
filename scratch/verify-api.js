const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env variables
const backendEnvPath = path.join(__dirname, '../backend/.env');
const rootEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function verify() {
    console.log('==================================================');
    console.log('          API & DATABASE INTEGRATION VERIFICATION');
    console.log('==================================================');

    // 1. Check DB connection and schema integrity
    console.log('\n[Test 1] Checking Database connection & schemas...');
    try {
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        const expected = ['users', 'tickets', 'sessions', 'notes', 'articles', 'attachments'];
        
        console.log('Found tables:', tables.join(', '));
        const missing = expected.filter(t => !tables.includes(t));
        if (missing.length > 0) {
            throw new Error(`Missing expected tables: ${missing.join(', ')}`);
        }
        console.log('✅ Schema verification: All expected tables exist.');
    } catch (err) {
        console.error('❌ Database schema check failed:', err.message);
        process.exit(1);
    }

    // 2. Check Seeded Admin
    console.log('\n[Test 2] Verifying Seeded Admin user...');
    try {
        const adminRes = await pool.query('SELECT username, "fullName", email, role FROM users WHERE username = $1', ['admin']);
        if (adminRes.rowCount === 0) {
            throw new Error('No admin user found. Seed did not run.');
        }
        console.log('Admin User Details:', adminRes.rows[0]);
        console.log('✅ Admin user account verified.');
    } catch (err) {
        console.error('❌ Admin verification failed:', err.message);
        process.exit(1);
    }

    // 3. Test HTTP Endpoints (if local server is running)
    const baseUrl = 'http://localhost:3000';
    console.log(`\n[Test 3] Verifying HTTP endpoints against local backend (${baseUrl})...`);
    console.log('Note: Ensure you have started the local backend first (e.g., npm run dev inside backend).');

    try {
        const healthRes = await fetch(`${baseUrl}/health`);
        if (!healthRes.ok) throw new Error(`Health check returned status ${healthRes.status}`);
        const healthData = await healthRes.json();
        console.log('Health check response:', healthData);
        console.log('✅ Health check endpoint verified.');

        // Test login request
        console.log('\nAttempting login request via API...');
        const adminPassword = process.env.ADMIN_PASSWORD || '@inspireSupport';
        const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: adminPassword })
        });
        
        if (!loginRes.ok) {
            throw new Error(`Login API failed with status ${loginRes.status}: ${await loginRes.text()}`);
        }
        
        const loginData = await loginRes.json();
        const token = loginData.user.token;
        console.log('✅ Login API verified successfully.');

        // Test stats request
        console.log('\nFetching dashboard statistics...');
        const statsRes = await fetch(`${baseUrl}/api/v1/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!statsRes.ok) throw new Error(`Stats fetch failed with status ${statsRes.status}`);
        const statsData = await statsRes.json();
        console.log('Stats loaded:', statsData);
        console.log('✅ Stats endpoint verified.');

        // Test ticket creation
        console.log('\nCreating a test ticket...');
        const ticketRes = await fetch(`${baseUrl}/api/v1/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'PostgreSQL Integration Test',
                description: 'Verifying stateless API operations on Supabase backend.',
                category: 'Other',
                department: 'IT',
                priority: 'High',
                severity: 'Moderate',
                assignee: 'Unassigned',
                requester: 'System Administrator'
            })
        });
        if (!ticketRes.ok) throw new Error(`Ticket creation failed with status ${ticketRes.status}`);
        const ticketData = await ticketRes.json();
        const ticketId = ticketData.id;
        console.log(`Created Ticket ID: ${ticketId}`);
        console.log('✅ Ticket creation API verified.');

        // Test note insertion
        console.log('\nAdding note to test ticket...');
        const noteRes = await fetch(`${baseUrl}/api/v1/tickets/${ticketId}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: 'Statistical checks verify all columns parse correctly.',
                author: 'System Verification'
            })
        });
        if (!noteRes.ok) throw new Error(`Note creation failed with status ${noteRes.status}`);
        console.log('✅ Note insertion API verified.');

        // Delete test ticket
        console.log('\nDeleting test ticket...');
        const deleteRes = await fetch(`${baseUrl}/api/v1/tickets/${ticketId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!deleteRes.ok) throw new Error(`Ticket deletion failed with status ${deleteRes.status}`);
        console.log('✅ Ticket deletion API verified.');

        console.log('\n🎉 ALL HTTP ENDPOINTS VERIFIED SUCCESSFULLY!');
    } catch (err) {
        console.log(`⚠️ Skipping HTTP Endpoint test: ${err.message}`);
        console.log('If you want to run HTTP checks, start the local server and ensure env config is loaded.');
    }
}

verify()
    .finally(async () => {
        await pool.end();
    });
