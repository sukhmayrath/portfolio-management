import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', '..', 'data', 'portfolio.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Migrations: add new columns to existing tables
const migrations = [
  "ALTER TABLE projects ADD COLUMN health_status TEXT DEFAULT 'Green'",
  "ALTER TABLE projects ADD COLUMN health_note TEXT",
  "ALTER TABLE projects ADD COLUMN priority_score INTEGER DEFAULT 50",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

export default db;
