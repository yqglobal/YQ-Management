const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env.deployment', 'utf8');
const renderToken2 = env.match(/RENDER_TOKEN_2="(.*?)"/)[1];

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const ownersRes = await request({
    hostname: 'api.render.com',
    path: '/v1/owners',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json' }
  });
  const owner = ownersRes.data[0].owner;
  console.log('Owner ID:', owner.id);
  
  const dbsRes = await request({
    hostname: 'api.render.com',
    path: '/v1/postgres',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json' }
  });
  
  let dbData = (dbsRes.data || []).find(db => db.postgres.name === 'evo-db')?.postgres;
  
  if (!dbData) {
    console.log('Creating free Postgres DB...');
    const createDbRes = await request({
      hostname: 'api.render.com',
      path: '/v1/postgres',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json', 'Content-Type': 'application/json' }
    }, {
      name: 'evo-db',
      ownerId: owner.id,
      plan: 'free',
      version: '15',
      databaseName: 'evo_db',
      databaseUser: 'evo_user'
    });
    
    if (createDbRes.status >= 400) {
      console.log('Failed to create DB:', JSON.stringify(createDbRes.data, null, 2));
      // In free tier, we might hit the limit of 1 free DB. If so, let's grab the first one.
      const firstDb = dbsRes.data[0]?.postgres;
      if (firstDb) {
         console.log('Falling back to existing DB:', firstDb.name);
         dbData = firstDb;
      } else {
         return;
      }
    } else {
      dbData = createDbRes.data;
    }
  } else {
    console.log('Found existing DB:', dbData.id);
  }
  
  // Poll for connection string
  let internalUrl = dbData.connectionInfo?.internalConnectionString;
  let attempts = 0;
  while (!internalUrl && attempts < 10) {
    console.log(`Polling for connection info... attempt ${attempts + 1}`);
    await sleep(5000);
    const dbPollRes = await request({
      hostname: 'api.render.com',
      path: `/v1/postgres/${dbData.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json' }
    });
    dbData = dbPollRes.data;
    internalUrl = dbData.connectionInfo?.internalConnectionString;
    attempts++;
  }
  
  if (!internalUrl) {
    console.log('Could not get internal connection string after polling!');
    return;
  }
  
  console.log('Internal URL found successfully.');
  
  const srvRes = await request({
    hostname: 'api.render.com',
    path: '/v1/services',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json' }
  });
  
  const evoService = srvRes.data.find(s => s.service.name.includes('evolution') || s.service.name.includes('evo'));
  if (!evoService) {
    console.log('Could not find evo service');
    return;
  }
  const evoId = evoService.service.id;
  
  const envRes = await request({
    hostname: 'api.render.com',
    path: `/v1/services/${evoId}/env-vars`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json' }
  });
  
  let envVars = envRes.data || [];
  const newEnvVars = envVars.map(e => ({ key: e.envVar.key, value: e.envVar.value }));
  
  const updateOrAdd = (key, value) => {
    const existing = newEnvVars.find(e => e.key === key);
    if (existing) existing.value = value;
    else newEnvVars.push({ key, value });
  };
  
  updateOrAdd('DATABASE_PROVIDER', 'postgresql');
  updateOrAdd('DATABASE_CONNECTION_URI', internalUrl);
  // Optional, usually evolution needs these configs:
  updateOrAdd('DATABASE_CLIENT_NAME', 'evo_client');
  
  console.log('Updating env vars for Evo service...');
  const updateRes = await request({
    hostname: 'api.render.com',
    path: `/v1/services/${evoId}/env-vars`,
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json', 'Content-Type': 'application/json' }
  }, newEnvVars);
  
  if (updateRes.status >= 400) {
     console.log('Failed to update env vars:', JSON.stringify(updateRes.data, null, 2));
  } else {
     console.log('Env vars updated successfully.');
  }
  
  console.log('Triggering deploy for Evo service...');
  const deployRes = await request({
    hostname: 'api.render.com',
    path: `/v1/services/${evoId}/deploys`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json', 'Content-Type': 'application/json' }
  }, { clearCache: 'do_not_clear' });
  
  console.log('Deploy status:', deployRes.status);
}

main().catch(console.error);
