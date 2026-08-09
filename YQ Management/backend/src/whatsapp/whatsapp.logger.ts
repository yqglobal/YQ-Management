import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsappLogger {
  private readonly logger = new Logger(WhatsappLogger.name);
  private logFilePath: string;

  constructor() {
    // Ensure logs directory exists
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFilePath = path.join(logDir, 'whatsapp-evo.log');
  }

  private writeLog(level: string, source: string, message: string, data?: any) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        source,
        message,
        data: data || undefined,
      };

      fs.appendFileSync(this.logFilePath, JSON.stringify(logEntry) + '\n');
    } catch (e) {
      this.logger.error(`Failed to write to whatsapp log file: ${e}`);
    }
  }

  info(source: string, message: string, data?: any) {
    this.logger.log(`[${source}] ${message}`);
    this.writeLog('INFO', source, message, data);
  }

  warn(source: string, message: string, data?: any) {
    this.logger.warn(`[${source}] ${message}`);
    this.writeLog('WARN', source, message, data);
  }

  error(source: string, message: string, data?: any) {
    this.logger.error(`[${source}] ${message}`);
    this.writeLog('ERROR', source, message, data);
  }

  debug(source: string, message: string, data?: any) {
    this.logger.debug(`[${source}] ${message}`);
    this.writeLog('DEBUG', source, message, data);
  }

  logRequest(url: string, method: string, payload?: any) {
    this.info('Evolution-API-Request', `${method} ${url}`, { payload });
  }

  logResponse(url: string, method: string, status: number, responseData?: any) {
    this.info('Evolution-API-Response', `${method} ${url} - Status ${status}`, { responseData });
  }

  logWebhook(instanceName: string, eventType: string, payload?: any) {
    this.info('Evolution-API-Webhook', `Incoming webhook from ${instanceName}: ${eventType}`, { payload });
  }
}
