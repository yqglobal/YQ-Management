export interface WhatsAppMessage {
  to: string;
  body: string;
}

export interface WhatsAppResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export interface WhatsAppProvider {
  sendText(to: string, body: string): Promise<WhatsAppResult>;
  sendButtons?(
    to: string,
    text: string,
    footer: string,
    buttons: Array<{ id: string; text: string }>,
  ): Promise<WhatsAppResult>;
  connect?(
    tenantId: string,
  ): Promise<{ instanceName: string; state: string; qr?: string }>;
  status?(instanceName: string): Promise<{ state: string }>;
  disconnect?(instanceName: string): Promise<void>;
}
