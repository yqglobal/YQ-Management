const fs = require('fs');
const file = '/home/abhimanyu/Projects/YQ/YQ Management/backend/prisma/migrations/20260827_schema_update/migration.sql';
let content = fs.readFileSync(file, 'utf8');

const insertStmt = `
-- Insert fallback Tenant for migrations
INSERT INTO "Tenant" ("id", "name", "subdomain")
VALUES ('system', 'System Default', 'system')
ON CONFLICT DO NOTHING;
`;

// Insert right after Tenant table creation
content = content.replace(/CONSTRAINT "Tenant_pkey" PRIMARY KEY \("id"\)\n\);/g, `CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")\n);\n${insertStmt}`);

fs.writeFileSync(file, content);
console.log('Added fallback tenant');
