import { Pool } from 'pg';

const isProd = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL && isProd) {
  console.error('❌ ERROR: DATABASE_URL environment variable is missing on Render!');
  console.error('👉 Please add DATABASE_URL (Internal Connection String from your Render PostgreSQL database) to your Web Service Environment variables.');
}

const connectionString = process.env.DATABASE_URL || 'postgresql://cybercrew:change_me_strong_password@localhost:5432/guardiancyber';

const pool = new Pool({
  connectionString,
  ssl: isProd || connectionString.includes('sslmode=') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default pool;
