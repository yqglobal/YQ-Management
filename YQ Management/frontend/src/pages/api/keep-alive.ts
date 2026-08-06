import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Vercel Cron Keep-Alive Handler
 *
 * This endpoint is called every 10 minutes by Vercel's free cron scheduler.
 * It pings the Render backend and Evolution API to prevent them from hibernating
 * on the free tier (which spins down after 15 minutes of inactivity).
 *
 * Security: Accepts requests only from Vercel Cron (via CRON_SECRET header)
 * or from internal callers who know the secret.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Validate secret — Vercel automatically sends this header
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'https://qmova-backend.onrender.com';
  const evoUrl = process.env.EVOLUTION_API_URL || 'https://qmova-evolution-api.onrender.com';
  const evoApiKey = process.env.EVOLUTION_API_KEY || '';

  const results: Record<string, { status: number | string; ok: boolean }> = {};

  // Ping backend health endpoint
  try {
    const backendRes = await fetch(`${backendUrl}/health`, {
      signal: AbortSignal.timeout(20000),
    });
    results.backend = { status: backendRes.status, ok: backendRes.ok };
  } catch (err: any) {
    results.backend = { status: err.message || 'error', ok: false };
  }

  // Ping Evolution API
  try {
    const evoRes = await fetch(`${evoUrl}/instance/fetchInstances`, {
      headers: { apikey: evoApiKey },
      signal: AbortSignal.timeout(20000),
    });
    results.evolutionApi = { status: evoRes.status, ok: evoRes.ok };
  } catch (err: any) {
    results.evolutionApi = { status: err.message || 'error', ok: false };
  }

  const allOk = Object.values(results).every((r) => r.ok);

  return res.status(allOk ? 200 : 207).json({
    timestamp: new Date().toISOString(),
    results,
    allOk,
  });
}
