import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Cron } from '@nestjs/schedule';
import { WhatsappLogger } from './whatsapp.logger';
import { QueueGateway } from '../queue/queue.gateway';
import { WhatsappChatbot } from './whatsapp.chatbot';

interface EvolutionError {
  message: string;
  status?: number;
  raw: string;
}

interface FetchEvoResult {
  status: number;
  data: any;
  error?: EvolutionError;
}

type InstanceState = 'connecting' | 'open' | 'close' | 'unconfigured';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly evoUrl =
    process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  private readonly evoApiKey = process.env.EVOLUTION_API_KEY || '';
  private readonly appUrl = process.env.APP_URL || 'http://localhost:3001';
  // Public URL where the backend receives webhooks. In many deployments APP_URL
  // points to the frontend (Vercel). Provide BACKEND_PUBLIC_URL to explicitly
  // direct Evolution webhooks to the backend (Render) public URL, e.g.
  // BACKEND_PUBLIC_URL=https://qmova-backend.onrender.com
  private readonly backendPublicUrl =
    process.env.BACKEND_PUBLIC_URL || this.appUrl;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private readonly whatsappLogger: WhatsappLogger,
    private readonly queueGateway: QueueGateway,
  ) {}

  async onModuleInit() {
    this.logger.log(
      'WhatsappService initialized. Starting sync of WhatsApp instances...',
    );
    // We wait briefly to ensure Prisma and Redis are fully connected
    setTimeout(() => this.syncAllInstances(), 5000);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @Cron('0 */5 * * * *')
  async handleCronSync() {
    this.logger.debug(
      'Running background auto-recovery sync for WhatsApp instances...',
    );
    await this.syncAllInstances();
  }

  /**
   * Syncs the database state of 'whatsappConnected: true' with the Evolution API.
   * If a tenant is supposed to be connected but their instance is missing/down, it attempts to recreate it.
   * Also prunes stale instances stuck in connecting state for > 5 minutes.
   */
  async syncAllInstances() {
    try {
      const evoRes = await this.fetchEvo('/instance/fetchInstances', 'GET');
      // If Evolution API is unreachable (cold start, restart), skip sync entirely
      if (evoRes.error) {
        this.logger.warn(
          `syncAllInstances: Evolution API unreachable (${evoRes.error.message}). Skipping sync to avoid false disconnects.`,
        );
        return;
      }

      const activeInstancesData = Array.isArray(evoRes?.data)
        ? evoRes.data
        : [];
      const activeInstances = activeInstancesData.map(
        (i: any) => i.instance?.instanceName || i.name || i.instanceName,
      );

      // Build a set of instance names owned by a tenant (never prune these)
      const allTenants = await this.prisma.tenant.findMany({
        where: { whatsappInstanceId: { not: null } },
        select: { id: true, whatsappInstanceId: true, whatsappConnected: true },
      });
      const ownedInstances = new Set(
        allTenants.map((t) => t.whatsappInstanceId).filter(Boolean),
      );

      // 1. Only prune ORPHANED 'connecting' instances (not owned by any tenant)
      //    Never prune tenant-owned instances — Evolution may be reconnecting from PostgreSQL.
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
      for (const instance of activeInstancesData) {
        const instanceName =
          instance.instance?.instanceName ||
          instance.name ||
          instance.instanceName;
        if (!instanceName) continue;

        // Skip any instance that belongs to a tenant
        if (ownedInstances.has(instanceName)) continue;

        const status =
          instance.connectionStatus ||
          instance.instance?.state ||
          instance.state;
        const updatedAtStr = instance.updatedAt || instance.createdAt;
        if (!updatedAtStr) continue;

        const updatedAt = new Date(updatedAtStr);
        if (status === 'connecting' && updatedAt < twentyMinutesAgo) {
          this.logger.warn(
            `Orphaned instance ${instanceName} stuck in connecting for >20 mins. Pruning...`,
          );
          await this.fetchEvo(`/instance/delete/${instanceName}`, 'DELETE');
        }
      }

      // 2. Sync tenants that should be connected
      const connectedTenants = allTenants.filter((t) => t.whatsappConnected);
      for (const tenant of connectedTenants) {
        if (!tenant.whatsappInstanceId) continue;
        const instanceName = tenant.whatsappInstanceId;

        if (!activeInstances.includes(instanceName)) {
          // Instance not found in Evolution API.
          // With DATABASE_SAVE_DATA_INSTANCE=true, Evolution API persists sessions to PostgreSQL.
          // After a cold start / redeploy, Evolution loads them automatically — we must give it
          // time before treating this as a genuine disconnect.
          this.logger.warn(
            `Tenant ${tenant.id} instance ${instanceName} not found in Evolution API. Will attempt soft recovery (create-without-QR).`,
          );
          await this.logTenantEvent(tenant.id, 'AUTO_RECOVERY_STARTED', {
            reason: 'Instance missing from Evolution API',
          });

          // Try to recreate the instance structure without triggering a QR
          // (Evolution will restore session from PostgreSQL automatically on creation)
          const createResult = await this.fetchEvo('/instance/create', 'POST', {
            instanceName,
            qrcode: false, // Do NOT request QR — the session should restore from DB
            integration: 'WHATSAPP-BAILEYS',
            syncFullHistory: false,
            readMessages: false,
          });

          if (
            !createResult.error ||
            createResult.status === 409 ||
            createResult.status === 400
          ) {
            // Instance was created or already existed — set webhook and let it reconnect on its own
            await this.setWebhook(instanceName).catch(() => {});
            this.logger.log(
              `Auto-recovery: Created instance ${instanceName} (session will restore from DB). Webhook set.`,
            );
            await this.logTenantEvent(
              tenant.id,
              'AUTO_RECOVERY_INSTANCE_CREATED',
              {
                instanceName,
              },
            );
          } else {
            this.logger.error(
              `Auto-recovery failed for ${instanceName}: ${createResult.error?.message}`,
            );
            await this.logTenantEvent(tenant.id, 'AUTO_RECOVERY_FAILED', {
              error: createResult.error?.message,
            });
          }
        } else {
          // Instance exists in Evolution API — check its state
          const stateRes = await this.fetchEvo(
            `/instance/connectionState/${instanceName}`,
            'GET',
          );
          const state = this.extractState(stateRes.data);

          if (state === 'open') {
            if (!tenant.whatsappConnected) {
              this.logger.warn(
                `Zombie socket detected for ${instanceName}! DB says disconnected, but Evolution API says open. Attempting soft restart...`,
              );
              // Ping connect to see if Evolution API can force a socket refresh
              await this.fetchEvo(
                `/instance/connect/${instanceName}`,
                'GET',
              ).catch(() => {});
            }
            // Connected — just ensure webhook is configured
            await this.setWebhook(instanceName).catch(() => {});
            this.logger.log(
              `Instance ${instanceName} is open. Webhook refreshed.`,
            );
          } else if (state === 'connecting') {
            // Reconnecting (likely loading from PostgreSQL after restart) — do nothing, let it complete
            this.logger.debug(
              `Instance ${instanceName} is reconnecting. Waiting for auto-reconnect from PostgreSQL...`,
            );
          } else {
            // state === 'close' — instance is registered but not reconnecting
            // This can happen if the session expired, phone is offline, or Evolution is waiting for backoff.
            // Do NOT call /connect here! Calling /connect while Evolution is naturally backing off
            // can corrupt the session or force a new QR code.
            // Evolution API natively handles reconnection with its own exponential backoff.
            // We just wait for the webhook to notify us of 'connection.update'.
            this.logger.debug(
              `Instance ${instanceName} is in 'close' state. Trusting Evolution API native auto-reconnect. No action taken.`,
            );
          }
        }
      }
    } catch (e) {
      this.logger.error(
        'Failed to sync WhatsApp instances during auto-recovery',
        e,
      );
    }
  }

  private buildEvolutionError(status: number, raw: string): EvolutionError {
    let message = 'Evolution API request failed';
    try {
      const parsed = JSON.parse(raw);
      const apiMessage =
        parsed?.response?.message || parsed?.message || parsed?.error;
      if (Array.isArray(apiMessage)) {
        message = apiMessage.join(', ');
      } else if (typeof apiMessage === 'string' && apiMessage.length > 0) {
        message = apiMessage;
      }
    } catch {
      if (raw.length > 0) message = raw;
    }

    this.logger.error(`Evolution API Error ${status}: ${message}`);
    return { message, status, raw };
  }

  private classifyNetworkError(path: string, error: unknown): EvolutionError {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('aborted') ||
      message.includes('timeout') ||
      message.includes('ETIMEDOUT')
    ) {
      this.logger.error(`Evolution API timeout: ${path}`);
      return {
        message: `Evolution API request timed out for ${path}`,
        status: 408,
        raw: message,
      };
    }
    if (
      message.includes('ECONNREFUSED') ||
      message.includes('NetworkError') ||
      message.includes('fetch failed')
    ) {
      this.logger.error(`Evolution API unreachable: ${path}`);
      return {
        message:
          'Evolution API is unreachable. Check the service and network connectivity.',
        status: 503,
        raw: message,
      };
    }
    if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
      this.logger.error(`Evolution API DNS failure: ${path}`);
      return {
        message: 'Cannot resolve Evolution API host. Check EVOLUTION_API_URL.',
        status: 503,
        raw: message,
      };
    }
    this.logger.error(`Evolution API network error for ${path}: ${message}`);
    return {
      message: `Evolution API network error for ${path}: ${message}`,
      status: 502,
      raw: message,
    };
  }

  async logTenantEvent(tenantId: string, action: string, details?: any) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        details: details || {},
      };

      const key = `whatsapp:logs:${tenantId}`;
      await this.redisService.client.lpush(key, JSON.stringify(logEntry));
      await this.redisService.client.ltrim(key, 0, 99); // Keep last 100 logs

      this.logger.debug(`[Tenant ${tenantId}] logged action: ${action}`);
    } catch (e) {
      this.logger.error(`Failed to push tenant event log for ${tenantId}`, e);
    }
  }

  async getTenantLogs(tenantId: string) {
    try {
      const key = `whatsapp:logs:${tenantId}`;
      const logs = await this.redisService.client.lrange(key, 0, -1);
      return logs.map((log) => JSON.parse(log));
    } catch (e) {
      this.logger.error(`Failed to fetch tenant event logs for ${tenantId}`, e);
      return [];
    }
  }

  // Dev helper: read a Redis debug key (returns parsed JSON when possible)
  async getDebugKey(key: string) {
    try {
      const raw = await this.redisService.client.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch (e) {
      this.logger.warn(
        `Failed to read debug key ${key}: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }

  // Return a cached QR (if any) from recent connect attempts stored in Redis.
  // This is safe for tenant-level access and allows frontend to render a QR instantly
  // while a fresh connect request runs in the background.
  async getCachedQr(tenantId: string) {
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant) return null;
    try {
      const key = `whatsapp:debug:${tenant.id}:connectRaw`;
      const raw = await this.redisService.client.get(key);
      if (!raw) return null;
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
      const qr = this.extractQr(parsed);
      // Get TTL in seconds to inform frontend when cached QR expires
      let ttl = -2;
      try {
        ttl = await this.redisService.client.ttl(key);
      } catch (e) {
        /* ignore */
      }
      const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
      return { qr: qr || null, expiresAt };
    } catch (e) {
      this.logger.warn(
        `Failed to read cached connectRaw for tenant ${tenantId}: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }

  async fetchEvo(
    path: string,
    method: string = 'GET',
    body?: any,
    timeoutMs: number = 15000,
  ): Promise<FetchEvoResult> {
    const startTime = Date.now();
    const fullUrl = `${this.evoUrl}${path}`;

    if (!this.evoUrl) {
      const errorMsg = 'Evolution API URL is not configured.';
      this.logger.warn(
        {
          evoRequest: { method, url: fullUrl, path, body },
          error: errorMsg,
        },
        `Evolution API Skipped: ${method} ${path} -> ${errorMsg}`,
      );
      return {
        status: 0,
        data: null,
        error: { message: errorMsg, raw: '' },
      };
    }

    this.logger.log(
      {
        evoRequest: { method, url: fullUrl, path, body: body || null },
      },
      `Evolution API Request: ${method} ${path}`,
    );
    this.whatsappLogger.logRequest(fullUrl, method, body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          apikey: this.evoApiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      const durationMs = Date.now() - startTime;
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      if (!res.ok) {
        const evolutionError = this.buildEvolutionError(res.status, text);
        this.logger.error(
          {
            evoRequest: { method, url: fullUrl, path, body },
            evoResponse: { status: res.status, raw: text, parsed },
            durationMs,
          },
          `Evolution API Failed [Status ${res.status}]: ${method} ${path} (${durationMs}ms) -> ${evolutionError.message}`,
        );
        this.whatsappLogger.logResponse(fullUrl, method, res.status, {
          raw: text,
          parsed,
          error: evolutionError,
        });
        return { status: res.status, data: parsed, error: evolutionError };
      }

      this.logger.log(
        {
          evoRequest: { method, url: fullUrl, path, body },
          evoResponse: { status: res.status, parsed },
          durationMs,
        },
        `Evolution API Response [Status ${res.status}]: ${method} ${path} (${durationMs}ms) -> Success`,
      );
      this.whatsappLogger.logResponse(fullUrl, method, res.status, parsed);
      return { status: res.status, data: parsed };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const evolutionError = this.classifyNetworkError(path, error);
      this.logger.error(
        {
          evoRequest: { method, url: fullUrl, path, body },
          evolutionError,
          durationMs,
        },
        `Evolution API Network/Timeout Error: ${method} ${path} (${durationMs}ms) -> ${evolutionError.message}`,
      );
      this.whatsappLogger.error(
        'Evolution-API-Network',
        `Network error for ${method} ${path}: ${evolutionError.message}`,
      );
      return {
        status: evolutionError.status ?? 502,
        data: null,
        error: evolutionError,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractQr(data: any): string | null {
    if (!data) return null;
    // Base64 image string directly
    if (typeof data === 'string' && data.startsWith('data:image')) return data;
    // Raw QR code text (the actual string that would be encoded in the QR)
    // Evolution API often returns this in the `code` field
    if (
      typeof data?.code === 'string' &&
      data.code.length > 10 &&
      !data.code.startsWith('data:image')
    )
      return data.code;
    if (
      typeof data?.qrCode === 'string' &&
      data.qrCode.length > 10 &&
      !data.qrCode.startsWith('data:image')
    )
      return data.qrCode;
    if (
      typeof data?.qr_code === 'string' &&
      data.qr_code.length > 10 &&
      !data.qr_code.startsWith('data:image')
    )
      return data.qr_code;
    // Base64 image in nested qrcode object
    if (data?.qrcode?.base64) return data.qrcode.base64;
    if (data?.qrcode?.image) return data.qrcode.image;
    if (data?.qrcode?.dataUrl) return data.qrcode.dataUrl;
    if (data?.base64) return data.base64;
    if (data?.base64Image) return data.base64Image;
    if (data?.instance?.qrcode?.base64) return data.instance.qrcode.base64;
    if (data?.instance?.qrcode?.image) return data.instance.qrcode.image;
    if (data?.instance?.qrcode?.dataUrl) return data.instance.qrcode.dataUrl;
    if (data?.instance?.qrCode) return data.instance.qrCode;
    // Fallback: any string qrcode field
    if (typeof data?.qrcode === 'string') return data.qrcode;
    if (typeof data?.qr === 'string' && data.qr.length > 10) return data.qr;
    if (typeof data?.qrCodeBase64 === 'string' && data.qrCodeBase64.length > 10)
      return data.qrCodeBase64;
    // Raw long strings (can be a raw QR value like "2@abc123...")
    if (typeof data === 'string' && data.length > 10) return data;
    if (typeof data?.response?.qrcode?.base64 === 'string')
      return data.response.qrcode.base64;
    if (typeof data?.response?.qrcode?.image === 'string')
      return data.response.qrcode.image;
    if (typeof data?.response?.qr === 'string' && data.response.qr.length > 10)
      return data.response.qr;
    // Additional nested fallbacks seen in some Evolution responses
    if (typeof data?.payload?.qr === 'string' && data.payload.qr.length > 10)
      return data.payload.qr;
    if (typeof data?.payload?.qrcode?.base64 === 'string')
      return data.payload.qrcode.base64;
    if (
      typeof data?.data?.instance?.qrcode === 'string' &&
      data.data.instance.qrcode.length > 10
    )
      return data.data.instance.qrcode;
    return null;
  }

  private extractPairingCode(data: any): string | null {
    if (!data) return null;
    if (data?.pairingCode) return data.pairingCode;
    if (data?.instance?.pairingCode) return data.instance.pairingCode;
    return null;
  }

  private findInstanceByName(instances: any[], targetName: string): any {
    if (!Array.isArray(instances) || !targetName) return null;
    return (
      instances.find(
        (inst: any) =>
          inst?.name === targetName ||
          inst?.instanceName === targetName ||
          inst?.instance?.instanceName === targetName ||
          inst?.instance?.name === targetName,
      ) || null
    );
  }

  private extractState(data: any): InstanceState {
    const status =
      data?.instance?.state ||
      data?.instance?.status ||
      data?.instance?.connectionStatus ||
      data?.state ||
      data?.connectionStatus ||
      'close';
    if (status === 'open' || status === 'connected') return 'open';
    if (status === 'connecting') return 'connecting';
    return 'close';
  }

  async setWebhook(instanceName: string) {
    if (!instanceName) {
      this.logger.warn('setWebhook called with empty instanceName');
      return;
    }

    const secretParams = process.env.WEBHOOK_SECRET
      ? `?secret=${process.env.WEBHOOK_SECRET}`
      : '';
    // Prefer a dedicated backend public URL for webhooks. APP_URL may be the
    // frontend public address (Vercel) which will cause Evolution to POST to
    // a URL that doesn't exist. Use BACKEND_PUBLIC_URL in production to avoid
    // that misconfiguration.
    const webhookBase = this.backendPublicUrl;
    const webhookUrl = `${webhookBase}/whatsapp/webhook/${instanceName}${secretParams}`;
    // Warn if APP_URL looks like a frontend host and BACKEND_PUBLIC_URL wasn't set
    if (
      !process.env.BACKEND_PUBLIC_URL &&
      /vercel\.app|vercel\.com|now\.sh/.test(this.appUrl)
    ) {
      this.logger.warn(
        `APP_URL (${this.appUrl}) looks like a frontend host. Consider setting BACKEND_PUBLIC_URL to the backend public URL so Evolution webhooks target the backend: e.g. BACKEND_PUBLIC_URL=https://qmova-backend.onrender.com`,
      );
    }
    this.logger.debug(
      `Setting webhook for ${instanceName} -> ${webhookUrl.split('?')[0]}`,
    );

    const result = await this.fetchEvo(`/webhook/set/${instanceName}`, 'POST', {
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'MESSAGES_UPDATE'],
      },
    });

    if (result.error) {
      this.logger.warn(
        `Failed to set webhook for ${instanceName}: ${result.error.message}`,
      );
      throw new HttpException(result.error.message, HttpStatus.BAD_GATEWAY);
    }

    this.logger.log(`Webhook set for ${instanceName} -> ${webhookUrl}`);
  }

  private async resolveTenant(targetId?: string) {
    if (!targetId) return null;
    let tenant = await this.prisma.tenant.findUnique({
      where: { id: targetId },
    });
    if (!tenant) {
      const ws = this.prisma.workspace?.findUnique
        ? await this.prisma.workspace.findUnique({
            where: { id: targetId },
          })
        : null;
      if (ws) {
        tenant = await this.prisma.tenant.findUnique({
          where: { id: ws.tenantId },
        });
      }
    }
    if (!tenant) {
      const user = this.prisma.user?.findUnique
        ? await this.prisma.user.findUnique({
            where: { id: targetId },
            include: { tenant: true },
          })
        : null;
      if (user?.tenant) {
        tenant = user.tenant;
      }
    }
    return tenant;
  }

  async connect(tenantId: string, forceRefresh = false) {
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant)
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);

    let instanceName = tenant.whatsappInstanceId;
    if (!instanceName) {
      instanceName = `tenant_${tenant.id.substring(0, 8)}`;
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappInstanceId: instanceName },
      });
    }

    this.logger.log(
      `WhatsApp connect requested for tenant ${tenant.id} -> instance ${instanceName}. forceRefresh=${forceRefresh}`,
    );
    await this.logTenantEvent(tenant.id, 'CONNECT_REQUESTED', {
      instanceName,
      forceRefresh,
    });

    // Step 1: Check if instance exists in Evolution API
    let stateRes = await this.fetchEvo(
      `/instance/connectionState/${instanceName}`,
      'GET',
    );

    // If user explicitly requested a refresh, we delete the existing instance
    // to guarantee Evolution API generates a completely fresh session and QR.
    if (forceRefresh && !stateRes.error) {
      this.logger.log(
        `Force refresh requested. Deleting existing instance ${instanceName} to obtain fresh QR.`,
      );
      await this.fetchEvo(`/instance/delete/${instanceName}`, 'DELETE');
      stateRes = {
        error: { message: 'deleted', raw: '' },
        status: 404,
        data: null,
      };
    }

    const needsCreation =
      stateRes.error && (stateRes.status === 404 || stateRes.status === 400);

    if (needsCreation) {
      this.logger.log(
        `Instance ${instanceName} not found, creating new instance for tenant ${tenant.id}.`,
      );
      await this.logTenantEvent(tenant.id, 'INSTANCE_CREATION_STARTED', {
        instanceName,
      });

      let createResult = await this.fetchEvo('/instance/create', 'POST', {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        syncFullHistory: false,
        readMessages: false,
      });

      if (createResult.error) {
        if (
          createResult.status === 403 ||
          createResult.status === 409 ||
          createResult.status === 400
        ) {
          this.logger.warn(
            `Instance ${instanceName} already exists or is reserved, attempting connect instead.`,
          );
          await this.logTenantEvent(tenant.id, 'INSTANCE_CREATION_CONFLICT', {
            error: createResult.error.message,
          });
          createResult = await this.fetchEvo(
            `/instance/connect/${instanceName}`,
            'GET',
          );
        } else {
          await this.logTenantEvent(tenant.id, 'INSTANCE_CREATION_FAILED', {
            error: createResult.error.message,
          });
          throw new HttpException(
            createResult.error.message,
            createResult.status === 401
              ? HttpStatus.BAD_GATEWAY
              : HttpStatus.BAD_REQUEST,
          );
        }
      }

      await this.logTenantEvent(tenant.id, 'INSTANCE_CREATED', {
        instanceName,
      });
      // Attempt to ensure webhook is set after creation so Evolution sends events
      try {
        await this.setWebhook(instanceName);
      } catch (e) {
        this.logger.warn(
          `setWebhook after creation failed for ${instanceName}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    // Step 2: Request fresh connect (this forces Evolution to generate a new QR if not open)
    let connectRes: FetchEvoResult = {
      status: 0,
      data: null,
      error: { message: 'no response', raw: '' },
    };
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      connectRes = await this.fetchEvo(
        `/instance/connect/${instanceName}`,
        'GET',
      );
      if (!connectRes.error) break;
      this.logger.warn(
        `Connect attempt ${attempt} failed for ${instanceName}: ${connectRes.error.message}`,
      );
      if (attempt < maxAttempts) await this.sleep(500);
    }

    if (connectRes.error) {
      await this.logTenantEvent(tenant.id, 'CONNECT_FAILED', {
        error: connectRes.error.message,
      });
      throw new HttpException(connectRes.error.message, HttpStatus.BAD_GATEWAY);
    }

    // Log the raw connect response for debugging
    this.logger.log(
      `[DEBUG] Raw connect response for ${instanceName}: ${JSON.stringify(connectRes.data)}`,
    );

    // Persist raw connect response to Redis for short-term debugging (1 hour)
    try {
      // Keep cached connectRaw short-lived to avoid stale QR rendering on frontend
      await this.redisService.client.set(
        `whatsapp:debug:${tenant.id}:connectRaw`,
        JSON.stringify(connectRes.data),
        'EX',
        300,
      );
    } catch (e) {
      this.logger.warn(
        `Failed to persist raw connect response for ${instanceName}: ${e instanceof Error ? e.message : e}`,
      );
    }

    // Ensure webhook is set just in case (always try, even if creation path attempted earlier)
    try {
      await this.setWebhook(instanceName);
    } catch (e) {
      this.logger.warn(
        `setWebhook failed for ${instanceName}: ${e instanceof Error ? e.message : e}`,
      );
    }

    const qr = this.extractQr(connectRes.data);
    const state = this.extractState(connectRes.data);

    if (qr) await this.logTenantEvent(tenant.id, 'QR_GENERATED');
    this.logger.log(
      `WhatsApp connect result for ${instanceName}: state=${state}, qr=${qr ? 'present' : 'missing'}`,
    );

    // Log the actual QR type so we can debug rendering issues
    if (qr) {
      const isBase64Image = qr.startsWith('data:image');
      this.logger.log(
        `QR type for ${instanceName}: ${isBase64Image ? 'base64 image' : 'raw text string (length: ' + qr.length + ')'}`,
      );
      await this.logTenantEvent(tenant.id, 'QR_READY', {
        type: isBase64Image ? 'base64' : 'text',
        length: qr.length,
      });
    } else {
      this.logger.warn(
        `No QR found in connect response for ${instanceName}. Raw data: ${JSON.stringify(connectRes.data)}`,
      );
      await this.logTenantEvent(tenant.id, 'QR_MISSING', {
        rawData: JSON.stringify(connectRes.data).substring(0, 200),
      });

      // AUTO-RECOVERY FIX: If the instance didn't return a QR code and is not 'open', it's likely stuck in a broken state
      // (e.g. "conflict"). We should delete it from Evolution API so it can be cleanly recreated next time.
      if (state !== 'open') {
        this.logger.warn(
          `Instance ${instanceName} is broken (no QR and state is ${state}). Deleting from Evolution API for auto-recovery.`,
        );
        await this.logTenantEvent(tenant.id, 'INSTANCE_BROKEN_AUTO_DELETED', {
          instanceName,
        });
        await this.fetchEvo(`/instance/delete/${instanceName}`, 'DELETE');

        try {
          await this.redisService.client.del(
            `whatsapp:debug:${tenant.id}:connectRaw`,
          );
        } catch (e) {}
      }
    }

    return {
      instanceName,
      state: state === 'open' ? 'open' : 'connecting',
      qr: qr || undefined,
      // Signal to frontend whether QR is a base64 image or a raw text string
      qrType: qr
        ? qr.startsWith('data:image')
          ? 'base64'
          : 'text'
        : undefined,
    };
  }

  async checkNumberExists(
    tenantId: string,
    phoneNumber: string,
  ): Promise<boolean> {
    if (!phoneNumber) return false;
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant || !tenant.whatsappInstanceId) return false;

    // Normalize phone number (strip +, -, spaces)
    const normalizedPhone = phoneNumber.replace(/[\s+-]/g, '');

    try {
      const res = await this.fetchEvo(
        `/chat/whatsappNumbers/${tenant.whatsappInstanceId}`,
        'POST',
        { numbers: [normalizedPhone] },
        5000, // 5 seconds timeout
      );

      if (res.error) {
        this.logger.warn(
          `Failed to check if number ${normalizedPhone} exists: ${res.error.message}`,
        );
        // If the Evolution API errors out, assume the number is NOT valid or WhatsApp is unreachable
        return false;
      }

      const data = Array.isArray(res.data) ? res.data : [res.data];
      const match = data.find((item: any) => item?.exists === true);

      return !!match;
    } catch (e) {
      this.logger.warn(
        `Exception checking number ${normalizedPhone}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }

  async generatePairingCode(tenantId: string, phoneNumber: string) {
    if (!phoneNumber)
      throw new HttpException(
        'Phone number is required for pairing code',
        HttpStatus.BAD_REQUEST,
      );
    const normalizedPhone = phoneNumber.replace(/[\s+-]/g, '');
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant)
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);

    let instanceName = tenant.whatsappInstanceId;
    if (!instanceName) {
      instanceName = `tenant_${tenant.id.substring(0, 8)}`;
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappInstanceId: instanceName },
      });
    }

    this.logger.log(
      `WhatsApp pairing code requested for tenant ${tenant.id} -> instance ${instanceName}, phone ${normalizedPhone}`,
    );
    await this.logTenantEvent(tenant.id, 'PAIRING_CODE_REQUESTED', {
      instanceName,
      phone: normalizedPhone,
    });

    let stateRes = await this.fetchEvo(
      `/instance/connectionState/${instanceName}`,
      'GET',
    );

    // FORCE REFRESH for Pairing Code: If the instance exists but is not 'open',
    // it might be stuck in a QR code session. We MUST delete it and recreate
    // it to guarantee Evolution API generates a pairing code instead of returning the old QR.
    if (!stateRes.error && stateRes.data?.instance?.state !== 'open') {
      this.logger.log(
        `Deleting existing non-open instance ${instanceName} to force fresh pairing code generation.`,
      );
      await this.fetchEvo(`/instance/delete/${instanceName}`, 'DELETE');
      stateRes = {
        error: { message: 'deleted', raw: '' },
        status: 404,
        data: null,
      };
    }

    const needsCreation =
      stateRes.error && (stateRes.status === 404 || stateRes.status === 400);

    if (needsCreation) {
      await this.logTenantEvent(tenant.id, 'INSTANCE_CREATION_STARTED', {
        instanceName,
      });
      let createResult = await this.fetchEvo('/instance/create', 'POST', {
        instanceName,
        qrcode: false,
        integration: 'WHATSAPP-BAILEYS',
        syncFullHistory: false,
        readMessages: false,
      });

      if (createResult.error) {
        if (
          createResult.status === 403 ||
          createResult.status === 409 ||
          createResult.status === 400
        ) {
          this.logger.warn(
            `Instance ${instanceName} already exists or is reserved, attempting connect instead.`,
          );
          await this.logTenantEvent(tenant.id, 'INSTANCE_CREATION_CONFLICT', {
            error: createResult.error.message,
          });
          createResult = await this.fetchEvo(
            `/instance/connect/${instanceName}`,
            'GET',
          );
        } else {
          await this.logTenantEvent(tenant.id, 'INSTANCE_CREATION_FAILED', {
            error: createResult.error.message,
          });
          throw new HttpException(
            createResult.error.message,
            createResult.status === 401
              ? HttpStatus.BAD_GATEWAY
              : HttpStatus.BAD_REQUEST,
          );
        }
      }
      await this.logTenantEvent(tenant.id, 'INSTANCE_CREATED', {
        instanceName,
      });
    }

    const connectRes = await this.fetchEvo(
      `/instance/connect/${instanceName}?number=${normalizedPhone}`,
      'GET',
    );

    if (connectRes.error) {
      await this.logTenantEvent(tenant.id, 'PAIRING_CODE_FAILED', {
        error: connectRes.error.message,
      });
      throw new HttpException(connectRes.error.message, HttpStatus.BAD_GATEWAY);
    }

    if (!needsCreation) {
      try {
        await this.setWebhook(instanceName);
      } catch (e) {}
    }

    const pairingCode = this.extractPairingCode(connectRes.data);
    const qr = this.extractQr(connectRes.data);
    const state = this.extractState(connectRes.data);

    if (pairingCode) {
      await this.logTenantEvent(tenant.id, 'PAIRING_CODE_GENERATED', {
        pairingCode,
      });
    } else {
      this.logger.warn(
        `No Pairing Code found in connect response for ${instanceName}. Raw data: ${JSON.stringify(connectRes.data)}`,
      );
      await this.logTenantEvent(tenant.id, 'PAIRING_CODE_MISSING', {
        rawData: JSON.stringify(connectRes.data).substring(0, 200),
      });

      // AUTO-RECOVERY FIX
      if (state !== 'open') {
        this.logger.warn(
          `Instance ${instanceName} is broken (no Pairing Code and state is ${state}). Deleting from Evolution API for auto-recovery.`,
        );
        await this.logTenantEvent(tenant.id, 'INSTANCE_BROKEN_AUTO_DELETED', {
          instanceName,
        });
        await this.fetchEvo(`/instance/delete/${instanceName}`, 'DELETE');
      }

      throw new HttpException(
        'Failed to generate pairing code. The backend auto-recovered the instance. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.logger.log(
      `WhatsApp pairing code result for ${instanceName}: state=${state}, pairingCode=${pairingCode ? 'present' : 'missing'}`,
    );

    return {
      instanceName,
      state: state === 'open' ? 'open' : 'connecting',
      pairingCode: pairingCode || undefined,
      qr: qr || undefined,
    };
  }

  async disconnect(tenantId: string) {
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant || !tenant.whatsappInstanceId) {
      return { success: true };
    }

    const instanceName = tenant.whatsappInstanceId;

    // Attempt to logout from evolution API
    await this.fetchEvo(`/instance/logout/${instanceName}`, 'DELETE');

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { whatsappConnected: false },
    });

    return { success: true };
  }

  async testMessage(tenantId: string, phone: string, message: string) {
    this.logger.log(
      `Initiating test message to ${phone} for tenant ${tenantId}`,
    );
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant || !tenant.whatsappInstanceId) {
      this.logger.warn(
        `Test message failed: WhatsApp not connected for tenant ${tenantId}`,
      );
      throw new HttpException(
        'WhatsApp is not connected',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.sendMessage(
        tenant.whatsappInstanceId,
        phone,
        message,
      );
      if (!result.success) {
        this.logger.error(`Test message to ${phone} failed: ${result.error}`);
        throw new HttpException(
          result.error || 'Failed to send message',
          HttpStatus.BAD_GATEWAY,
        );
      }
      this.logger.log(`Successfully sent test message to ${phone}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Exception during test message to ${phone}: ${error.message}`,
      );
      throw error instanceof HttpException
        ? error
        : new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async status(tenantId: string) {
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant || !tenant.whatsappInstanceId) {
      return { state: 'unconfigured' as InstanceState };
    }

    const instanceName = tenant.whatsappInstanceId;
    const stateResult = await this.fetchEvo(
      `/instance/connectionState/${instanceName}`,
      'GET',
    );

    if (stateResult.error) {
      if (stateResult.status === 404) {
        this.logger.warn(
          `WhatsApp instance ${instanceName} not found in Evolution API. Keeping instance name for reconnection.`,
        );
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: { whatsappConnected: false },
        });
        return {
          instanceName,
          state: 'unconfigured' as InstanceState,
          whatsappConnected: false,
        };
      }
      this.logger.error(
        `Failed to get connection state for ${instanceName}: ${stateResult.error.message}`,
      );
      return {
        instanceName,
        state: 'close' as InstanceState,
        whatsappConnected: false,
        error: stateResult.error.message,
      };
    }

    const state = this.extractState(stateResult.data);
    const isConnected = state === 'open';

    // DO NOT fetch /instance/connect here! Polling it breaks QR rotation in Baileys.
    // The QR code is handled via /whatsapp/connect and cached via webhooks in Redis.

    if (isConnected && !tenant.whatsappConnected) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappConnected: true },
      });
    } else if (!isConnected && tenant.whatsappConnected) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappConnected: false },
      });
    }

    const finalState = isConnected
      ? ('open' as InstanceState)
      : state === 'connecting'
        ? ('connecting' as InstanceState)
        : ('close' as InstanceState);

    let connectedNumber: string | undefined;
    if (isConnected && stateResult.data?.ownerJid) {
      connectedNumber = stateResult.data.ownerJid.split('@')[0];
    } else if (isConnected && stateResult.data?.number) {
      connectedNumber = stateResult.data.number;
    }

    return {
      instanceName,
      state: finalState,
      whatsappConnected: isConnected,
      connectedNumber,
    };
  }

  async saveChatbotSettings(tenantId: string, settings: any) {
    const resolvedTenant = await this.resolveTenant(tenantId);
    if (!resolvedTenant)
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
    const tenant = await this.prisma.tenant.update({
      where: { id: resolvedTenant.id },
      data: {
        chatbotEnabled: settings.enabled,
        chatbotConfig: settings.config,
      },
    });
    return {
      success: true,
      chatbotEnabled: tenant.chatbotEnabled,
      chatbotConfig: tenant.chatbotConfig,
    };
  }

  async handleWebhook(instanceName: string, payload: any) {
    this.logger.debug(
      `Webhook received for ${instanceName}: event=${payload?.event}`,
    );
    this.whatsappLogger.logWebhook(instanceName, payload?.event, payload);

    // Save last webhook payload for quick debugging (1 hour)
    try {
      await this.redisService.client.set(
        `whatsapp:debug:${instanceName}:lastWebhook`,
        JSON.stringify(payload),
        'EX',
        3600,
      );
    } catch (e) {
      this.logger.warn(
        `Failed to persist webhook payload for ${instanceName}: ${e instanceof Error ? e.message : e}`,
      );
    }

    try {
      if (payload?.event === 'connection.update' && payload?.data) {
        // Save rotated QR code to Redis if present
        if (payload.data.qr || payload.data.base64) {
          try {
            const tenant = await this.prisma.tenant.findFirst({
              where: { whatsappInstanceId: instanceName },
            });
            if (tenant) {
              const connectRaw = {
                base64: payload.data.base64,
                code: payload.data.qr,
              };
              await this.redisService.client.set(
                `whatsapp:debug:${tenant.id}:connectRaw`,
                JSON.stringify(connectRaw),
                'EX',
                300,
              );

              // Broadcast the QR update instantly to the frontend via WebSockets
              const qr = payload.data.base64 || payload.data.qr;
              const qrType = payload.data.base64 ? 'base64' : 'text';
              this.queueGateway.broadcastTenantUpdate(
                tenant.id,
                'whatsapp_connection_update',
                {
                  instanceName,
                  state: 'connecting',
                  qr,
                  qrType,
                },
              );
            }
          } catch (e) {}
        } else if (payload.data.state === 'connecting') {
          // It's connecting, but there's no QR code. This usually means the QR was scanned
          // and it's currently syncing. Broadcast qr: null to clear the UI QR code instantly.
          try {
            const tenant = await this.prisma.tenant.findFirst({
              where: { whatsappInstanceId: instanceName },
            });
            if (tenant) {
              this.queueGateway.broadcastTenantUpdate(
                tenant.id,
                'whatsapp_connection_update',
                {
                  instanceName,
                  state: 'connecting',
                  qr: null,
                },
              );
            }
          } catch (e) {}
        }

        const state = payload.data.state;
        const statusCode =
          payload.data.statusReason ||
          payload.data.statusCode ||
          payload.data.reason;

        if (state === 'close' || state === 'refused') {
          if (
            statusCode === 401 ||
            statusCode === 403 ||
            statusCode === '401' ||
            statusCode === '403'
          ) {
            await this.prisma.tenant.updateMany({
              where: { whatsappInstanceId: instanceName },
              data: { whatsappConnected: false },
            });
            this.logger.warn(
              `WhatsApp disconnected (Hard Logout - ${statusCode}) for instance ${instanceName}`,
            );

            const tenant = await this.prisma.tenant.findFirst({
              where: { whatsappInstanceId: instanceName },
            });
            if (tenant) {
              await this.logTenantEvent(tenant.id, 'DISCONNECTED', {
                reason: statusCode,
              });
              this.queueGateway.broadcastTenantUpdate(
                tenant.id,
                'whatsapp_connection_update',
                {
                  instanceName,
                  state: 'close',
                },
              );
            }

            // Delete the instance in Evolution to free up RAM since the user logged out permanently
            try {
              await this.fetchEvo(`/instance/delete/${instanceName}`, 'DELETE');
              this.logger.log(
                `Instance ${instanceName} deleted from Evolution API due to hard logout.`,
              );
            } catch (e) {
              this.logger.warn(
                `Failed to delete instance ${instanceName} after hard logout: ${e}`,
              );
            }
          } else {
            this.logger.warn(
              `WhatsApp connection closed temporarily (Code ${statusCode}) for instance ${instanceName}. Waiting for auto-recovery...`,
            );
            const tenant = await this.prisma.tenant.findFirst({
              where: { whatsappInstanceId: instanceName },
            });
            if (tenant) {
              this.queueGateway.broadcastTenantUpdate(
                tenant.id,
                'whatsapp_connection_update',
                {
                  instanceName,
                  state: 'connecting',
                },
              );
            }
          }
        } else if (state === 'open') {
          await this.prisma.tenant.updateMany({
            where: { whatsappInstanceId: instanceName },
            data: { whatsappConnected: true },
          });
          this.logger.log(`WhatsApp connected for instance ${instanceName}`);
          const tenant = await this.prisma.tenant.findFirst({
            where: { whatsappInstanceId: instanceName },
          });
          if (tenant) {
            this.queueGateway.broadcastTenantUpdate(
              tenant.id,
              'whatsapp_connection_update',
              {
                instanceName,
                state: 'open',
              },
            );
          }
        }
        return { success: true };
      }

      // Dev helper: read a Redis debug key (returns parsed JSON when possible)
      // (moved to class method to avoid nesting function declarations)

      if (payload?.event === 'messages.update' && payload?.data) {
        for (const update of payload.data) {
          const messageId = update?.key?.id;
          const status = update?.update?.status; // 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ
          if (messageId && status) {
            let statusStr = '';
            if (status === 2) statusStr = 'SENT (1 tick)';
            else if (status === 3) statusStr = 'DELIVERED (2 ticks)';
            else if (status === 4) statusStr = 'READ (blue ticks)';

            if (statusStr) {
              const tenant = await this.prisma.tenant.findFirst({
                where: { whatsappInstanceId: instanceName },
              });
              if (tenant) {
                await this.logTenantEvent(tenant.id, 'MESSAGE_STATUS_UPDATE', {
                  messageId,
                  status: statusStr,
                });
              }
            }
          }
        }
        return { success: true };
      }

      if (payload?.event !== 'messages.upsert' || !payload?.data) {
        this.logger.debug(
          `Ignoring unsupported webhook event: ${payload?.event}`,
        );
        return { ignored: true };
      }

      const message = payload.data.message;
      const jid = payload.data.key?.remoteJid;
      const fromMe = payload.data.key?.fromMe;
      const messageId = payload.data.key?.id;

      if (fromMe || !jid || jid.includes('@g.us')) {
        this.logger.debug(`Ignoring outgoing or group message from ${jid}`);
        return { ignored: true };
      }

      if (messageId) {
        const isDuplicate = await this.redisService.client.get(
          `webhook_processed:${messageId}`,
        );
        if (isDuplicate) {
          this.logger.debug(
            `Ignoring duplicate webhook for messageId ${messageId}`,
          );
          return { ignored: true, reason: 'duplicate' };
        }
        await this.redisService.client.set(
          `webhook_processed:${messageId}`,
          '1',
          'EX',
          86400,
        ); // 24 hours
      }

      const phone = jid.split('@')[0];
      if (!phone) {
        this.logger.warn(`Could not extract phone from JID: ${jid}`);
        return { ignored: true };
      }

      let text = '';
      if (message?.conversation) text = message.conversation;
      else if (message?.extendedTextMessage?.text)
        text = message.extendedTextMessage.text;
      else if (message?.buttonsResponseMessage?.selectedButtonId)
        text = message.buttonsResponseMessage.selectedButtonId;
      else if (message?.listResponseMessage?.title)
        text = message.listResponseMessage.title;

      if (!text || !text.trim()) {
        this.logger.debug(`Empty message from ${phone}`);
        return { ignored: true };
      }

      // Preserve original casing for the chatbot's fuzzy matching
      const rawText = text.trim();
      this.logger.log(
        `Received message from ${phone} on instance ${instanceName}: ${rawText}`,
      );

      const tenant = await this.prisma.tenant.findFirst({
        where: { whatsappInstanceId: instanceName },
        include: {
          subscriptions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { plan: true },
          },
        },
      });

      if (!tenant) {
        this.logger.warn(`No tenant found for instance ${instanceName}`);
        return { ignored: true };
      }

      if (!tenant.chatbotEnabled) {
        this.logger.debug(`Chatbot disabled for tenant ${tenant.id}`);
        return { ignored: true };
      }

      const planFeatures = tenant.subscriptions?.[0]?.plan?.features as any;
      if (!planFeatures?.whatsappChatbot) {
        this.logger.debug(
          `Chatbot blocked by subscription plan for tenant ${tenant.id}`,
        );
        return { ignored: true };
      }

      // Delegate to chatbot state machine
      const bot = new WhatsappChatbot(
        this.prisma,
        async (jidToSend, textToSend) => {
          await this.sendMessage(instanceName, jidToSend, textToSend);
        },
      );
      const botResult = await bot.process(tenant, phone, jid, rawText);

      // If the bot says human is handling it (or they just requested a human), log the message!
      if (botResult.isHumanPaused) {
        // Upsert CustomerConversation
        const conversation = await this.prisma.customerConversation.upsert({
          where: {
            tenantId_customerPhone: {
              tenantId: tenant.id,
              customerPhone: phone,
            },
          },
          update: {
            lastMessageAt: new Date(),
            unreadCount: { increment: 1 },
            status: 'OPEN',
          },
          create: {
            tenantId: tenant.id,
            customerPhone: phone,
            status: 'OPEN',
            unreadCount: 1,
          },
        });

        // Store the incoming message for the Inbox UI
        await this.prisma.message.create({
          data: {
            tenantId: tenant.id,
            customerPhone: phone,
            conversationId: conversation.id,
            body: rawText,
            sender: 'CUSTOMER',
            isRead: false,
          },
        });

        // Notify any open dashboard websockets about a new inbox message
        this.redisService.client.publish(
          'queue_events',
          JSON.stringify({
            type: 'NEW_INBOX_MESSAGE',
            tenantId: tenant.id,
            phone,
          }),
        );
      }

      return { handled: true, action: 'chatbot' };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `Error handling webhook for instance ${instanceName}`,
        e,
      );
      return { handled: false, error: errorMessage };
    }
  }

  async sendMessage(instanceName: string, number: string, text: string) {
    if (!instanceName || !number || !text) {
      this.logger.warn(
        `sendMessage called with invalid params: instance=${instanceName}, number=${number}`,
      );
      return { success: false, error: 'Invalid parameters' };
    }

    const normalizedNumber = number.replace(/\D/g, '');
    this.logger.debug(
      `Sending message on ${instanceName} to normalized number: ${normalizedNumber}`,
    );

    const result = await this.fetchEvo(
      `/message/sendText/${instanceName}`,
      'POST',
      {
        number: normalizedNumber,
        options: { delay: 0, presence: 'composing' },
        text,
      },
      25000,
    );

    if (result.error) {
      this.logger.error(
        `Failed to send WhatsApp message to ${normalizedNumber} on ${instanceName}: ${result.error.message}`,
      );
      const tenant = await this.prisma.tenant.findFirst({
        where: { whatsappInstanceId: instanceName },
      });
      if (tenant) {
        await this.logTenantEvent(tenant.id, 'MESSAGE_SEND_FAILED', {
          number: normalizedNumber,
          error: result.error.message,
        });

        // AUTO-REPAIR: If error indicates instance is disconnected or broken
        if (
          result.status === 401 ||
          result.status === 404 ||
          result.status === 428 ||
          result.status === 408 ||
          result.status === 502 ||
          result.status === 503 ||
          result.error.message.includes('not connected')
        ) {
          this.logger.warn(
            `Auto-repair triggered for ${instanceName}. Marking as disconnected due to send failure.`,
          );
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { whatsappConnected: false },
          });
          await this.logTenantEvent(tenant.id, 'DISCONNECTED', {
            reason:
              'Message dispatch failed. Instance likely silent-disconnected.',
          });
        }
      }
      let errorMsg = result.error.message;
      if (
        result.status === 408 ||
        result.status === 502 ||
        result.status === 503
      ) {
        errorMsg =
          'WhatsApp connection is temporarily unsynchronized. The system is auto-recovering the connection in the background. Please try again in 10-20 seconds.';
      }
      return { success: false, error: errorMsg };
    }

    this.logger.log(
      `Sent WhatsApp message to ${normalizedNumber} on ${instanceName}`,
    );
    const tenant = await this.prisma.tenant.findFirst({
      where: { whatsappInstanceId: instanceName },
    });
    if (tenant)
      await this.logTenantEvent(tenant.id, 'MESSAGE_SENT', {
        number: normalizedNumber,
        providerId: result.data?.key?.id,
      });
    return { success: true, providerId: result.data?.key?.id };
  }

  // Send a message by resolving the tenant's configured instanceName.
  async sendToTenant(tenantId: string, number: string, text: string) {
    if (!tenantId) {
      return { success: false, error: 'Missing tenantId' };
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant || !tenant.whatsappInstanceId || !tenant.whatsappConnected) {
      this.logger.warn(
        `Tenant ${tenantId} WhatsApp is not configured or disconnected`,
      );
      return { success: false, error: 'WhatsApp not configured or disconnected' };
    }
    return this.sendMessage(tenant.whatsappInstanceId, number, text);
  }

  async sendMediaMessage(
    instanceName: string,
    number: string,
    base64: string,
    mediaType: string = 'image',
    caption: string = '',
  ) {
    if (!instanceName || !number || !base64) {
      return { success: false, error: 'Invalid parameters' };
    }
    const normalizedNumber = number.replace(/\D/g, '');
    const result = await this.fetchEvo(
      `/message/sendMedia/${instanceName}`,
      'POST',
      {
        number: normalizedNumber,
        mediatype: mediaType,
        media: base64,
        caption: caption,
      },
    );
    if (result.error) {
      let errorMsg = result.error.message;
      if (
        result.status === 408 ||
        result.status === 502 ||
        result.status === 503
      ) {
        // Demote connection state so auto-healer can pick it up
        await this.prisma.tenant.updateMany({
          where: { whatsappInstanceId: instanceName },
          data: { whatsappConnected: false },
        });
        errorMsg =
          'WhatsApp connection is temporarily unsynchronized. The system is auto-recovering the connection in the background. Please try again in 10-20 seconds.';
      }
      return { success: false, error: errorMsg };
    }
    return { success: true, providerId: result.data?.key?.id };
  }

  async sendMediaToTenant(
    tenantId: string,
    number: string,
    base64: string,
    mediaType: string = 'image',
    caption: string = '',
  ) {
    if (!tenantId) return { success: false, error: 'Missing tenantId' };
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant || !tenant.whatsappInstanceId || !tenant.whatsappConnected) {
      return {
        success: false,
        error: 'Tenant WhatsApp not configured or connected',
      };
    }
    return this.sendMediaMessage(
      tenant.whatsappInstanceId,
      number,
      base64,
      mediaType,
      caption,
    );
  }

  async sendButtons(
    instanceName: string,
    number: string,
    text: string,
    footer: string,
    buttons: any[],
  ) {
    if (
      !instanceName ||
      !number ||
      !text ||
      !footer ||
      !Array.isArray(buttons) ||
      buttons.length === 0
    ) {
      this.logger.warn(
        `sendButtons called with invalid params: instance=${instanceName}, number=${number}`,
      );
      return { success: false, error: 'Invalid parameters' };
    }

    const normalizedNumber = number.replace(/\D/g, '');

    const result = await this.fetchEvo(
      `/message/sendButtons/${instanceName}`,
      'POST',
      {
        number: normalizedNumber,
        options: { delay: 0, presence: 'composing' },
        buttonMessage: { text, footer, buttons },
      },
    );

    if (result.error) {
      this.logger.error(
        `Failed to send WhatsApp buttons to ${normalizedNumber} on ${instanceName}: ${result.error.message}`,
      );
      let errorMsg = result.error.message;
      if (
        result.status === 408 ||
        result.status === 502 ||
        result.status === 503
      ) {
        // Demote connection state so auto-healer can pick it up
        await this.prisma.tenant.updateMany({
          where: { whatsappInstanceId: instanceName },
          data: { whatsappConnected: false },
        });
        errorMsg =
          'WhatsApp connection is temporarily unsynchronized. The system is auto-recovering the connection in the background. Please try again in 10-20 seconds.';
      }
      return { success: false, error: errorMsg };
    }

    this.logger.log(
      `Sent WhatsApp buttons to ${normalizedNumber} on ${instanceName}`,
    );
    return { success: true, providerId: result.data?.key?.id };
  }

  async requestFeedback(tenantId: string, phone: string, language: string) {
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant || !tenant.chatbotEnabled || !tenant.whatsappInstanceId) {
      this.logger.debug(
        `Skipping feedback request for tenant ${tenantId}: not configured`,
      );
      return;
    }

    const lang = language || 'en';
    const i18n = {
      en: 'Thanks for visiting! Please reply with a number from 1 to 5 to rate your experience (5 being excellent).',
      es: '¡Gracias por visitarnos! Por favor responde con un número del 1 al 5 para calificar tu experiencia (5 siendo excelente).',
      fr: 'Merci de votre visite ! Veuillez répondre par un chiffre de 1 à 5 pour évaluer votre expérience (5 étant excellent).',
    };
    const t = i18n[lang as keyof typeof i18n] || i18n.en;

    const result = await this.sendMessage(tenant.whatsappInstanceId, phone, t);
    if (!result.success) {
      this.logger.error(
        `Failed to send feedback request to ${phone} on ${tenant.whatsappInstanceId}: ${result.error}`,
      );
    }
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Array.from({ length: 8 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
    return `WVC-${timestamp}-${randomPart}`;
  }

  async generateValidationCode(tenantId: string) {
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant) {
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
    }

    const code = this.generateCode();
    await this.redisService.client.set(
      `whatsapp:validation-code:${tenantId}`,
      code,
      'EX',
      60,
    );

    this.logger.log(
      `Validation code generated for tenant ${tenantId}: ${code}`,
    );

    return { validationCode: code, expiresIn: 60 };
  }

  async connectWithValidationCode(tenantId: string, validationCode: string) {
    const tenant = await this.resolveTenant(tenantId);
    if (!tenant) {
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
    }

    const storedCode = await this.redisService.client.get(
      `whatsapp:validation-code:${tenantId}`,
    );
    if (!storedCode || storedCode !== validationCode) {
      throw new HttpException(
        'Invalid or expired validation code',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.redisService.client.del(`whatsapp:validation-code:${tenantId}`);

    const instanceName =
      tenant.whatsappInstanceId || `tenant_${tenant.id.substring(0, 8)}`;
    this.logger.log(
      `WhatsApp connect with validation code for tenant ${tenant.id} -> instance ${instanceName}`,
    );

    if (!tenant.whatsappInstanceId) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappInstanceId: instanceName },
      });
    }

    let createResult: FetchEvoResult;

    const fetchResult = await this.fetchEvo('/instance/fetchInstances', 'GET');
    const existingInstances: any[] = fetchResult.data ?? [];
    const existingInstance = this.findInstanceByName(
      existingInstances,
      instanceName,
    );

    if (!fetchResult.error && existingInstance) {
      const existingState = this.extractState(existingInstance);
      this.logger.log(
        `Instance ${instanceName} already exists in Evolution API with state=${existingState}. Reusing.`,
      );

      if (existingState === 'open' || existingState === 'connecting') {
        let qr = this.extractQr(existingInstance);
        if (!qr && existingState === 'connecting') {
          const connectRes = await this.fetchEvo(
            `/instance/connect/${instanceName}`,
            'GET',
          );
          if (!connectRes.error) {
            qr = this.extractQr(connectRes.data);
          }
        }
        await this.setWebhook(instanceName);
        return {
          instanceName,
          state: existingState,
          qr: qr || undefined,
        };
      }

      createResult = await this.fetchEvo(
        `/instance/connect/${instanceName}`,
        'GET',
      );
    } else {
      createResult = await this.fetchEvo('/instance/create', 'POST', {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        syncFullHistory: false,
        readMessages: false,
      });
    }

    if (createResult.error) {
      if (
        createResult.status === 409 ||
        createResult.status === 400 ||
        createResult.status === 403
      ) {
        this.logger.warn(
          `Instance ${instanceName} already exists or conflict, attempting connect...`,
        );
        createResult = await this.fetchEvo(
          `/instance/connect/${instanceName}`,
          'GET',
        );
      } else if (createResult.status === 401) {
        this.logger.error(
          `Evolution API auth failed during instance create. Check EVOLUTION_API_KEY.`,
        );
        throw new HttpException(
          'Evolution API authentication failed. Check API key configuration.',
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    if (createResult.error) {
      const status =
        createResult.status >= 500
          ? HttpStatus.BAD_GATEWAY
          : HttpStatus.BAD_REQUEST;
      throw new HttpException(createResult.error.message, status);
    }

    try {
      await this.setWebhook(instanceName);
    } catch (webhookError) {
      if (
        webhookError instanceof HttpException &&
        webhookError.getStatus() === HttpStatus.BAD_GATEWAY
      ) {
        this.logger.warn(
          `Webhook setup failed for ${instanceName}, but continuing...`,
        );
      }
    }

    const stateResult = await this.fetchEvo(
      `/instance/connectionState/${instanceName}`,
      'GET',
    );
    if (stateResult.error) {
      this.logger.error(
        `Failed to fetch connection state for ${instanceName}: ${stateResult.error.message}`,
      );
      throw new HttpException(
        `Failed to check WhatsApp instance state: ${stateResult.error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const state = this.extractState(stateResult.data);
    let qr =
      this.extractQr(createResult.data) || this.extractQr(stateResult.data);

    if (state === 'connecting' && !qr) {
      this.logger.warn(
        `Instance ${instanceName} is connecting but QR code is not yet available. Attempting to fetch via connect endpoint.`,
      );
      const connectRes = await this.fetchEvo(
        `/instance/connect/${instanceName}`,
        'GET',
      );
      if (!connectRes.error) {
        qr = this.extractQr(connectRes.data);
      }
    }

    if (
      state === 'close' &&
      createResult.status !== 409 &&
      createResult.status !== 400
    ) {
      this.logger.warn(
        `Instance ${instanceName} returned state=close immediately after connect request.`,
      );
    }

    this.logger.log(
      `WhatsApp connect with validation code result for ${instanceName}: state=${state}, qr=${qr ? 'present' : 'missing'}`,
    );

    return {
      instanceName,
      state,
      qr: qr || undefined,
    };
  }

  async sendList(
    instanceName: string,
    number: string,
    title: string,
    description: string,
    buttonText: string,
    sections: any[],
  ) {
    if (!instanceName || !number || !sections) {
      this.logger.warn(`sendList called with invalid params`);
      return { success: false, error: 'Invalid parameters' };
    }

    const normalizedNumber = number.replace(/\D/g, '');
    const result = await this.fetchEvo(
      `/message/sendList/${instanceName}`,
      'POST',
      {
        number: normalizedNumber,
        title,
        description,
        buttonText,
        footerText: 'Powered by YQ',
        sections,
      },
    );

    if (result.error) {
      this.logger.error(
        `Failed to send WhatsApp List to ${normalizedNumber}: ${result.error.message}`,
      );
      let errorMsg = result.error.message;
      if (
        result.status === 408 ||
        result.status === 502 ||
        result.status === 503
      ) {
        errorMsg =
          'WhatsApp phone appears to be offline or unreachable. Please ensure it has an active internet connection.';
      }
      return { success: false, error: errorMsg };
    }

    return { success: true, providerId: result.data?.key?.id };
  }
}
