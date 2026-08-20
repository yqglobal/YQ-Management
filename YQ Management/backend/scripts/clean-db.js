const { Client } = require('pg');

async function clean() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL provided, skipping clean-db');
    return;
  }
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to DB for cleanup');
    await client.query('DELETE FROM "Message"');
    console.log('Deleted all rows from Message table');
    await client.query('DELETE FROM "Subscription"');
    console.log('Deleted all rows from Subscription table');
  } catch (error) {
    console.error('Error cleaning db:', error);
  } finally {
    await client.end();
  }
}

clean();
