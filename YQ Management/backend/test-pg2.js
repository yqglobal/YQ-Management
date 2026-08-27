const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT * FROM "Queue"');
  console.log('Queues:', res.rows);
  const sq = await client.query('SELECT * FROM "_QueueToService"');
  console.log('QueueToService:', sq.rows);
  await client.end();
}
main().catch(console.error);
