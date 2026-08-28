const fs = require('fs');
const file = '/home/abhimanyu/Projects/YQ/YQ Management/backend/prisma/migrations/20260827_schema_update/migration.sql';
let content = fs.readFileSync(file, 'utf8');

// Add DEFAULT values to NOT NULL text columns
content = content.replace(/ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL;/g, 'ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL DEFAULT \'UNKNOWN\';');
content = content.replace(/ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL,/g, 'ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT \'system\',');
content = content.replace(/ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL;/g, 'ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT \'system\';');
content = content.replace(/ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL,/g, 'ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL DEFAULT \'unknown\',');
content = content.replace(/ADD COLUMN IF NOT EXISTS "ownerId" TEXT NOT NULL,/g, 'ADD COLUMN IF NOT EXISTS "ownerId" TEXT NOT NULL DEFAULT \'system\',');

// Verify if there are any other ADD COLUMN ... NOT NULL without DEFAULT
let lines = content.split('\n');
let missingDefaults = lines.filter(line => line.includes('ADD COLUMN') && line.includes('NOT NULL') && !line.includes('DEFAULT'));
console.log('Missing defaults:', missingDefaults);

fs.writeFileSync(file, content);
console.log('Migration fixed with DEFAULTS');
