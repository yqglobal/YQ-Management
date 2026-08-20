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

async function main() {
  const ownersRes = await request({
    hostname: 'api.render.com',
    path: '/v1/owners',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json' }
  });
  const owner = ownersRes.data[0].owner;
  console.log('Owner ID:', owner.id);
  
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
    return;
  }
  
  const dbData = createDbRes.data;
  console.log('Created DB:', dbData.id);
  
  const internalUrl = dbData.connectionInfo?.internalConnectionString || dbData.internalConnectionString;
  console.log('Internal URL found on creation:', !!internalUrl);
  
  if (!internalUrl) {
    console.log('Could not get internal connection string on creation!');
    console.log(JSON.stringify(dbData, null, 2));
    return;
  }
  
  const srvRes = await request({
    hostname: 'api.render.com',
    path: '/v1/services',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json' }
  });
  
  const evoService = srvRes.data.find(s => s.service.name.includes('evolution') || s.service.name.includes('evo'));
  if (!evoService) return;
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
  
  console.log('Updating env vars for Evo service...');
  const updateRes = await request({
    hostname: 'api.render.com',
    path: `/v1/services/${evoId}/env-vars`,
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${renderToken2}`, 'Accept': 'application/json', 'Content-Type': 'application/json' }
  }, newEnvVars);
  
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
