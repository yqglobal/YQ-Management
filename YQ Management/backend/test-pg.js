const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT id, "locationId", "tenantId", name FROM "Service"');
  console.log('Services:', res.rows);
  const locs = await client.query('SELECT id, name FROM "Location"');
  console.log('Locations:', locs.rows);
  await client.end();
}
main().catch(console.error);
