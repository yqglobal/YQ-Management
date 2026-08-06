import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as https from 'https';
import * as http from 'http';
import { SuperAdminService } from '../super-admin/super-admin.service';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);

  // Track consecutive failures for alerting
  private backendFailures = 0;
  private evoFailures = 0;

  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * Internal keep-alive: runs every 10 minutes inside the backend process.
   * Pings both the backend itself and the Evolution API so neither Render
   * free-tier instance hibernates after 15 minutes of silence.
   *
   * This is the "secondary" layer — it guards against Evolution API going down
   * when the backend is already awake.
   */
  @Cron('0 */10 * * * *')
  handleCron() {
    let toggles = { keepAliveBackend: true, keepAliveWhatsapp: true } as any;
    try {
      toggles = this.superAdminService.getSystemToggles() || toggles;
    } catch (err) {
      this.logger.warn('Failed to read Super Admin toggles — skipping keep-alive checks this run');
      return;
    }

    try {
      if (toggles.keepAliveBackend !== false) {
        this.pingBackend();
      } else {
        this.logger.warn('Backend keep-alive ping is DISABLED via Super Admin toggle.');
      }
    } catch (err) {
      this.logger.error('Error while pinging backend in keep-alive cron', err);
    }

    try {
      if (toggles.keepAliveWhatsapp !== false) {
        this.pingEvolutionApi();
      } else {
        this.logger.warn('Evolution API keep-alive ping is DISABLED via Super Admin toggle.');
      }
    } catch (err) {
      this.logger.error('Error while pinging Evolution API in keep-alive cron', err);
    }
  }

  private pingBackend() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      this.logger.warn('BACKEND_URL not defined — skipping backend ping');
      return;
    }

    const pingUrl = `${backendUrl.replace(/\/$/, '')}/health`;
    const client = pingUrl.startsWith('https') ? https : http;

    const req = client.get(pingUrl, (res) => {
      if (res.statusCode === 200) {
        this.backendFailures = 0;
        this.logger.log(
          `[KeepAlive] Backend ✓ (${res.statusCode}) — service is awake`,
        );
      } else {
        this.backendFailures++;
        this.logger.warn(
          `[KeepAlive] Backend responded with unexpected status ${res.statusCode} (failures: ${this.backendFailures})`,
        );
      }
    });

    req.on('error', (err) => {
      this.backendFailures++;
      this.logger.error(
        `[KeepAlive] Backend ping FAILED (failures: ${this.backendFailures}): ${err.message}`,
      );
    });

    req.setTimeout(15000, () => {
      this.backendFailures++;
      this.logger.error(
        `[KeepAlive] Backend ping TIMED OUT after 15s (failures: ${this.backendFailures})`,
      );
      req.destroy();
    });
  }

  private pingEvolutionApi() {
    const evoUrl = process.env.EVOLUTION_API_URL;
    const evoApiKey = process.env.EVOLUTION_API_KEY || '';

    if (!evoUrl) {
      this.logger.debug(
        'EVOLUTION_API_URL not defined — skipping Evolution API ping',
      );
      return;
    }

    // Ping fetchInstances — a lightweight authenticated endpoint that
    // proves the Evolution API is truly awake and authenticated
    const pingUrl = `${evoUrl.replace(/\/$/, '')}/instance/fetchInstances`;

    fetch(pingUrl, {
      headers: { apikey: evoApiKey },
      signal: AbortSignal.timeout(15000),
    })
      .then((res) => {
        if (res.ok) {
          this.evoFailures = 0;
          this.logger.log(
            `[KeepAlive] Evolution API ✓ (${res.status}) — service is awake`,
          );
        } else {
          this.evoFailures++;
          this.logger.warn(
            `[KeepAlive] Evolution API responded ${res.status} (failures: ${this.evoFailures})`,
          );
        }
      })
      .catch((err) => {
        this.evoFailures++;
        this.logger.error(
          `[KeepAlive] Evolution API ping FAILED (failures: ${this.evoFailures}): ${err instanceof Error ? err.message : String(err)}`,
        );

        // If Evolution API has been down for 3+ consecutive pings (30+ min),
        // log a critical alert so it shows up clearly in the system logs
        if (this.evoFailures >= 3) {
          this.logger.error(
            `[KeepAlive] ⚠️ CRITICAL: Evolution API has been unreachable for ${this.evoFailures * 10}+ minutes. WhatsApp notifications are disrupted.`,
          );
        }
      });
  }
}
