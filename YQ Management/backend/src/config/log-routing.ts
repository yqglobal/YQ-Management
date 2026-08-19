import pino from 'pino';
import build from 'pino-abstract-transport';
import pretty from 'pino-pretty';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';

const logDir = join(process.cwd(), 'logs');
mkdirSync(logDir, { recursive: true });

const serviceMap: Record<string, string> = {
  AuthController: 'auth',
  AuthService: 'auth',
  BrevoProvider: 'auth',
  PasswordResetService: 'auth',
  WhatsappService: 'whatsapp',
  WhatsappProcessor: 'whatsapp',
  WhatsappController: 'whatsapp',
  EvolutionProvider: 'whatsapp',
  PaymentsService: 'payments',
  PaymentsController: 'payments',
  BillingConfigService: 'payments',
  OzowProvider: 'payments',
  WebhooksService: 'webhooks',
  WebhookProcessService: 'webhooks',
  NotificationsService: 'webhooks',
  NotificationsController: 'webhooks',
  QueueGateway: 'queue',
  CommunicationProcessor: 'queue',
  CommunicationService: 'queue',
  CommunicationLogService: 'queue',
  TemplateService: 'queue',
  RedisService: 'infra',
  RateLimitService: 'infra',
  EmailService: 'infra',
  AuditService: 'infra',
  AllExceptionsFilter: 'infra',
};

function getServiceName(context: string): string {
  for (const [pattern, name] of Object.entries(serviceMap)) {
    if (context.includes(pattern)) {
      return name;
    }
  }
  return 'backend';
}

const fileStreams: Record<string, ReturnType<typeof createWriteStream>> = {};

function getFileStream(name: string): ReturnType<typeof createWriteStream> {
  if (!fileStreams[name]) {
    fileStreams[name] = createWriteStream(join(logDir, `${name}.log`), {
      flags: 'a',
    });
  }
  return fileStreams[name];
}

function cleanLogForFile(log: Record<string, any>): string {
  const cloned = { ...log };

  if (typeof cloned.time === 'number') {
    cloned.isoTime = new Date(cloned.time).toISOString();
  } else if (!cloned.isoTime) {
    cloned.isoTime = new Date().toISOString();
  }

  const levels: Record<number, string> = {
    10: 'TRACE',
    20: 'DEBUG',
    30: 'INFO',
    40: 'WARN',
    50: 'ERROR',
    60: 'FATAL',
  };
  if (typeof cloned.level === 'number') {
    cloned.levelName = levels[cloned.level] || 'INFO';
  }

  if (cloned.req && typeof cloned.req === 'object') {
    const { headers, ...restReq } = cloned.req;
    const cleanHeaders = headers
      ? {
          host: headers.host,
          'content-type': headers['content-type'],
          origin: headers.origin || headers.referer,
          'x-request-id': headers['x-request-id'],
        }
      : undefined;
    cloned.req = { ...restReq, headers: cleanHeaders };
  }

  return JSON.stringify(cloned) + '\n';
}

export default function createLogRoutingTransport(): pino.MultiStreamRes {
  const routingStream = build(function (stream) {
    stream.on('data', (log: Record<string, any>) => {
      try {
        const cleanStr = cleanLogForFile(log);
        const context = typeof log.context === 'string' ? log.context : '';
        const msg =
          typeof log.msg === 'string'
            ? log.msg
            : typeof log.message === 'string'
              ? log.message
              : '';

        // 1. Write all system events to unified system log
        getFileStream('system').write(cleanStr);

        // 2. Route incoming HTTP request traffic to http-traffic log
        if (
          log.req ||
          log.res ||
          msg.startsWith('HTTP ') ||
          msg.includes('request completed')
        ) {
          getFileStream('http-traffic').write(cleanStr);
        }

        // 3. Route all Evolution API and WhatsApp interactions to evolution.log and whatsapp.log
        if (
          context.includes('Whatsapp') ||
          context.includes('Evolution') ||
          msg.toLowerCase().includes('evolution') ||
          msg.toLowerCase().includes('whatsapp') ||
          log.evoRequest ||
          log.evoResponse ||
          log.evolutionError
        ) {
          getFileStream('evolution').write(cleanStr);
          getFileStream('whatsapp').write(cleanStr);
        } else {
          // 4. Standard service specific routing for non-whatsapp logs
          const serviceName = getServiceName(context);
          getFileStream(serviceName).write(cleanStr);
        }
      } catch {
        getFileStream('system').write(JSON.stringify(log) + '\n');
      }
    });
  });

  const prettyStream = pretty({
    singleLine: true,
    colorize: true,
    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
    ignore: 'pid,hostname,evoRequest,evoResponse',
  });

  return pino.multistream([
    { stream: routingStream, level: 'debug' },
    { stream: prettyStream, level: 'debug' },
  ]);
}
