import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppProvider } from '../interfaces/whatsapp.provider';

@Injectable()
export class EvolutionProvider implements WhatsAppProvider {
  private readonly logger = new Logger(EvolutionProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultInstance: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.defaultInstance = process.env.EVOLUTION_INSTANCE_NAME || '';
  }

  async fetch(path: string, method: string = 'GET', body?: any) {
    const startTime = Date.now();
    const fullUrl = `${this.baseUrl}${path}`;
    this.logger.log(
      {
        evoRequest: { method, url: fullUrl, path, body: body || null },
      },
      `Evolution Provider Request: ${method} ${path}`,
    );

    try {
      const res = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
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
        this.logger.error(
          {
            evoRequest: { method, url: fullUrl, path, body },
            evoResponse: { status: res.status, raw: text, parsed },
            durationMs,
          },
          `Evolution Provider Error [Status ${res.status}]: ${method} ${path} (${durationMs}ms) -> ${text}`,
        );
      } else {
        this.logger.log(
          {
            evoRequest: { method, url: fullUrl, path, body },
            evoResponse: { status: res.status, parsed },
            durationMs,
          },
          `Evolution Provider Response [Status ${res.status}]: ${method} ${path} (${durationMs}ms) -> Success`,
        );
      }
      return { status: res.status, data: parsed };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        {
          evoRequest: { method, url: fullUrl, path, body },
          error: errorMsg,
          durationMs,
        },
        `Evolution Provider Network Error: ${method} ${path} (${durationMs}ms) -> ${errorMsg}`,
      );
      return { status: 502, data: null };
    }
  }

  async sendText(
    to: string,
    body: string,
  ): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const startTime = Date.now();
    try {
      if (!this.baseUrl || !this.apiKey || !this.defaultInstance) {
        this.logger.warn(`[MOCK WHATSAPP] To: ${to} | Body: ${body}`);
        return { success: true, providerId: 'mock' };
      }

      const cleanNumber = to.replace(/\D/g, '');
      const path = `/message/sendText/${this.defaultInstance}`;
      const fullUrl = `${this.baseUrl}${path}`;
      const payload = { number: cleanNumber, text: body };

      this.logger.log(
        {
          evoRequest: { method: 'POST', url: fullUrl, path, body: payload },
        },
        `Evolution sendText requested to ${cleanNumber} on ${this.defaultInstance}`,
      );

      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const durationMs = Date.now() - startTime;
      const responseText = await res.text();
      let parsedData: any;
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        parsedData = responseText;
      }

      if (!res.ok) {
        this.logger.error(
          {
            evoRequest: { method: 'POST', url: fullUrl, path, body: payload },
            evoResponse: { status: res.status, raw: responseText },
            durationMs,
          },
          `Evolution API error sending message: Status ${res.status} (${durationMs}ms) -> ${responseText}`,
        );
        return {
          success: false,
          error: `Evolution API error: ${res.status} ${responseText}`,
        };
      }

      this.logger.log(
        {
          evoRequest: { method: 'POST', url: fullUrl, path, body: payload },
          evoResponse: { status: res.status, data: parsedData },
          durationMs,
        },
        `Sent WhatsApp message to ${cleanNumber} on ${this.defaultInstance} (${durationMs}ms)`,
      );
      return { success: true, providerId: parsedData.key?.id };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        {
          evoRequest: { to, body },
          error: errorMsg,
          durationMs,
        },
        `Failed to send WhatsApp message to ${to} (${durationMs}ms) -> ${errorMsg}`,
      );
      return { success: false, error: errorMsg };
    }
  }

  async sendButtons(
    to: string,
    text: string,
    footer: string,
    buttons: Array<{ id: string; text: string }>,
  ): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const startTime = Date.now();
    try {
      if (!this.baseUrl || !this.apiKey || !this.defaultInstance) {
        this.logger.warn(`[MOCK WHATSAPP] Buttons to: ${to} | Text: ${text}`);
        return { success: true, providerId: 'mock' };
      }

      const cleanNumber = to.replace(/\D/g, '');
      const path = `/message/sendButtons/${this.defaultInstance}`;
      const fullUrl = `${this.baseUrl}${path}`;
      const payload = {
        number: cleanNumber,
        delay: 1200,
        presence: 'composing',
        buttonMessage: { text, footer, buttons },
      };

      this.logger.log(
        {
          evoRequest: { method: 'POST', url: fullUrl, path, body: payload },
        },
        `Evolution sendButtons requested to ${cleanNumber} on ${this.defaultInstance}`,
      );

      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const durationMs = Date.now() - startTime;
      const responseText = await res.text();
      let parsedData: any;
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        parsedData = responseText;
      }

      if (!res.ok) {
        this.logger.error(
          {
            evoRequest: { method: 'POST', url: fullUrl, path, body: payload },
            evoResponse: { status: res.status, raw: responseText },
            durationMs,
          },
          `Evolution API error sending buttons: Status ${res.status} (${durationMs}ms) -> ${responseText}`,
        );
        return {
          success: false,
          error: `Evolution API error: ${res.status} ${responseText}`,
        };
      }

      this.logger.log(
        {
          evoRequest: { method: 'POST', url: fullUrl, path, body: payload },
          evoResponse: { status: res.status, data: parsedData },
          durationMs,
        },
        `Sent WhatsApp buttons to ${cleanNumber} on ${this.defaultInstance} (${durationMs}ms)`,
      );
      return { success: true, providerId: parsedData.key?.id };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        {
          evoRequest: { to, text, buttons },
          error: errorMsg,
          durationMs,
        },
        `Failed to send WhatsApp buttons to ${to} (${durationMs}ms) -> ${errorMsg}`,
      );
      return { success: false, error: errorMsg };
    }
  }

  async connect(
    workspaceId: string,
  ): Promise<{ instanceName: string; state: string; qr?: string }> {
    if (!this.baseUrl || !this.apiKey || !this.defaultInstance) {
      return {
        instanceName: `workspace_${workspaceId.substring(0, 8)}`,
        state: 'close',
      };
    }

    const instanceName = `workspace_${workspaceId.substring(0, 8)}`;
    let connectRes = await this.fetch('/instance/create', 'POST', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });

    if (
      connectRes.status === 403 ||
      connectRes.status === 400 ||
      connectRes.status === 409
    ) {
      connectRes = await this.fetch(`/instance/connect/${instanceName}`, 'GET');
    }

    const stateRes = await this.fetch(
      `/instance/connectionState/${instanceName}`,
      'GET',
    );
    const state =
      stateRes.data?.instance?.state ||
      stateRes.data?.instance?.status ||
      'close';

    let qr: string | undefined;
    if (connectRes.data?.qrcode?.base64) {
      qr = connectRes.data.qrcode.base64;
    } else if (connectRes.data?.base64) {
      qr = connectRes.data.base64;
    }

    return { instanceName, state, qr };
  }

  async status(instanceName: string): Promise<{ state: string; qr?: string }> {
    if (!this.baseUrl || !this.apiKey || !this.defaultInstance) {
      return { state: 'close' };
    }

    const stateRes = await this.fetch(
      `/instance/connectionState/${instanceName}`,
      'GET',
    );

    const state =
      stateRes.data?.instance?.state ||
      stateRes.data?.instance?.status ||
      'close';

    let qr: string | undefined;
    if (state === 'connecting') {
      const connectRes = await this.fetch(
        `/instance/connect/${instanceName}`,
        'GET',
      );
      if (connectRes.data?.base64) {
        qr = connectRes.data.base64;
      } else if (connectRes.data?.qrcode?.base64) {
        qr = connectRes.data.qrcode.base64;
      }
    }

    return { state, qr };
  }

  async disconnect(instanceName: string): Promise<void> {
    if (!this.baseUrl || !this.apiKey || !this.defaultInstance) {
      return;
    }

    await this.fetch(`/instance/logout/${instanceName}`, 'DELETE');
  }
}
