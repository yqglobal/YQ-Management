const fs = require('fs');
const file = '/home/abhimanyu/Projects/YQ/YQ Management/backend/prisma/migrations/20260827_schema_update/migration.sql';
let content = fs.readFileSync(file, 'utf8');

// Use ALTER TABLE IF EXISTS
content = content.replace(/ALTER TABLE "/g, 'ALTER TABLE IF EXISTS "');

// Make CREATE INDEX idempotent by checking IF NOT EXISTS
content = content.replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "');
content = content.replace(/CREATE UNIQUE INDEX "/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "');

// Make CREATE TABLE idempotent (Prisma doesn't support IF NOT EXISTS in all syntax, but Postgres does)
content = content.replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "');

fs.writeFileSync(file, content);
console.log('Migration fixed further');
