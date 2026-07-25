import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL || 'postgresql://cybercrew:change_me_strong_password@localhost:5432/guardiancyber';

const pool = new Pool({
  connectionString,
  ssl: isProd || connectionString.includes('sslmode=') ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('🗄️  Running migrations...');
  await pool.query(sql);
  console.log('✅ Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
