"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isProd = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL || 'postgresql://cybercrew:change_me_strong_password@localhost:5432/guardiancyber';
const pool = new pg_1.Pool({
    connectionString,
    ssl: isProd || connectionString.includes('sslmode=') ? { rejectUnauthorized: false } : false,
});
async function migrate() {
    const schemaPath = path_1.default.join(__dirname, 'schema.sql');
    const sql = fs_1.default.readFileSync(schemaPath, 'utf8');
    console.log('🗄️  Running migrations...');
    await pool.query(sql);
    console.log('✅ Migrations complete.');
    await pool.end();
}
migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
