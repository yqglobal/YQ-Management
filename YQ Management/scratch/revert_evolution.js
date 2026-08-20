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
  // Filter out the bad Postgres variables
  const newEnvVars = envVars
    .map(e => ({ key: e.envVar.key, value: e.envVar.value }))
    .filter(e => e.key !== 'DATABASE_PROVIDER' && e.key !== 'DATABASE_CONNECTION_URI');
  
  console.log('Updating env vars to remove postgres config...');
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
