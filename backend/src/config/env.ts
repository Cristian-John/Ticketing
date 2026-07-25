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

// Simple configuration verification log (excluding sensitive password detail)
console.log(`[Config] Loaded environment:
  - Port: ${ENV.PORT}
  - Node Env: ${ENV.NODE_ENV}
  - Database URL Set: ${!!ENV.DATABASE_URL}
  - Supabase URL Set: ${!!ENV.SUPABASE_URL}
  - Supabase Bucket: ${ENV.SUPABASE_STORAGE_BUCKET}
`);
