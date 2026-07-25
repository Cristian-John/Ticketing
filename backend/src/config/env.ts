import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const ENV = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '@inspireSupport',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'attachments'
};

// Strict environment configuration validation
const requiredEnvVars: (keyof typeof ENV)[] = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_STORAGE_BUCKET'
];

const missingOrInvalid = requiredEnvVars.filter(key => {
    const val = ENV[key];
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    return (
        !trimmed ||
        trimmed.startsWith('<') || 
        trimmed.endsWith('>') ||
        trimmed.toLowerCase().includes('placeholder') ||
        trimmed.toLowerCase().includes('your-')
    );
});

if (missingOrInvalid.length > 0) {
    console.error(`\n❌ [Fatal Error] Missing or invalid configuration for: ${missingOrInvalid.join(', ')}`);
    console.error(`Please check that your environment variables are configured correctly and do not contain placeholders.\n`);
    process.exit(1);
}

// Simple configuration verification log (excluding sensitive password detail)
console.log(`[Config] Loaded environment:
  - Port: ${ENV.PORT}
  - Node Env: ${ENV.NODE_ENV}
  - Database URL Set: ${!!ENV.DATABASE_URL}
  - Supabase URL Set: ${!!ENV.SUPABASE_URL}
  - Supabase Bucket: ${ENV.SUPABASE_STORAGE_BUCKET}
`);
