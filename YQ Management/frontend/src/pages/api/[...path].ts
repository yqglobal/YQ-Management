import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';
import https from 'https';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://qmova-backend.onrender.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const backendPath = url.pathname.replace(/^\/api/, '');
  const queryString = url.search;

  const backendHost = new URL(BACKEND_URL);
  const isHttps = backendHost.protocol === 'https:';

  const options: http.RequestOptions | https.RequestOptions = {
    hostname: backendHost.hostname,
    port: parseInt(backendHost.port) || (isHttps ? 443 : 80),
    path: `${backendPath}${queryString}`,
    method: req.method,
    headers: {
      ...req.headers,
      host: backendHost.hostname,
    },
  };

  const transport = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const proxyReq = transport.request(options, (proxyRes) => {
      const statusCode = proxyRes.statusCode || 200;
      res.status(statusCode);

      if (proxyRes.headers) {
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'content-encoding') {
            res.setHeader(key, value as string);
          }
        });
      }

      proxyRes.on('data', (chunk) => {
        res.write(chunk);
      });

      proxyRes.on('end', () => {
        res.end();
        resolve(statusCode);
      });

      proxyRes.on('close', () => {
        if (!res.writableEnded) {
          res.end();
        }
        resolve(statusCode);
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      if (!res.headersSent) {
        res.status(503).json({ message: 'Backend service unavailable', error: err.message });
      } else if (!res.writableEnded) {
        res.end();
      }
      reject(err);
    });

    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(503).json({ message: 'Backend request timeout' });
      } else if (!res.writableEnded) {
        res.end();
      }
      reject(new Error('Backend request timeout'));
    });

    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method || '') && Object.keys(req.body).length > 0) {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.write(body);
      if (options.headers && typeof options.headers === 'object') {
        delete (options.headers as Record<string, string>)['content-length'];
      }
    }

    proxyReq.end();
  });
}
