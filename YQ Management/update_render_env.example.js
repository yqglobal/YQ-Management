// Template for updating Render service environment variables.
// DO NOT commit real secrets. Use this file as a guide and set real values
// directly in Render's dashboard or via their secure CLI with an API token.

const currentEnv = [
  { key: 'BACKEND_URL', value: 'https://your-backend.onrender.com' },
  { key: 'APP_URL', value: 'https://your-frontend.vercel.app' },
  { key: 'FRONTEND_URL', value: 'https://your-frontend.vercel.app' },
  { key: 'NODE_ENV', value: 'production' },
  { key: 'DATABASE_URL', value: 'postgresql://user:pass@host:port/dbname' },
  { key: 'PORT', value: '10000' },
  { key: 'JWT_SECRET', value: '<GENERATED_JWT_SECRET>' },
  { key: 'NODE_VERSION', value: '20.x' },
  { key: 'REDIS_HOST', value: '<REDIS_HOST>' },
  { key: 'REDIS_PORT', value: '6379' },
  { key: 'GOOGLE_CLIENT_ID', value: '<GOOGLE_CLIENT_ID>' },
  { key: 'GOOGLE_CLIENT_SECRET', value: '<GOOGLE_CLIENT_SECRET>' },
  { key: 'SUPER_ADMIN_EMAIL', value: 'admin@example.com' },
  { key: 'BREVO_API_KEY', value: '<BREVO_API_KEY>' },
  { key: 'BREVO_LIST_ID', value: '2' },
  { key: 'OZOW_SITE_CODE', value: '<OZOW_SITE_CODE>' },
  { key: 'OZOW_PRIVATE_KEY', value: '<OZOW_PRIVATE_KEY>' },
  { key: 'OZOW_API_KEY', value: '<OZOW_API_KEY>' },
  { key: 'OZOW_SANDBOX', value: 'false' },
  { key: 'EVOLUTION_API_URL', value: 'https://evolution-api.example.com' },
  { key: 'EVOLUTION_API_KEY', value: '<EVOLUTION_API_KEY>' },
  { key: 'EVOLUTION_INSTANCE_NAME', value: '<DEFAULT_INSTANCE_NAME>' },
  { key: 'BACKEND_PUBLIC_URL', value: 'https://your-backend.onrender.com' },
  { key: 'WEBHOOK_SECRET', value: '<WEBHOOK_SECRET>' }
];

// Use Render dashboard to set these securely.
console.log('This is an example template. Do not use in production.');
