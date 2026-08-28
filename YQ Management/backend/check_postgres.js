const { execSync } = require('child_process');
try {
  const file = '/home/abhimanyu/Projects/YQ/YQ Management/backend/prisma/migrations/20260827_schema_update/migration.sql';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/ADD COLUMN     "/g, 'ADD COLUMN IF NOT EXISTS "');
  content = content.replace(/ALTER COLUMN "/g, 'ALTER COLUMN IF EXISTS "'); // This is not valid syntax in Postgres
  fs.writeFileSync(file, content);
} catch (e) {
  console.log('Ignore this snippet, doing via bash');
}
