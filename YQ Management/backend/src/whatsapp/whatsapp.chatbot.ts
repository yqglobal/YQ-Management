import { PrismaService } from '../prisma/prisma.service';

export class WhatsappChatbot {
  constructor(
    private prisma: PrismaService,
    private sendMsg: (jid: string, text: string) => Promise<void>,
  ) {}

  async process(tenant: any, phone: string, jid: string, rawText: string) {
    const text = rawText.trim();
    const upperText = text.toUpperCase();
    const tenantId = tenant.id;

    // Default configuration if missing
    const config = tenant.chatbotConfig || {
      botName: 'Assistant',
      welcomeMessage: 'Hi there! How can I help you today?',
      quickReplies: { status: true, cancel: true, human: true },
    };

    let session = await this.prisma.chatSession.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });

    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { tenantId, phone, step: 0 },
      });
    }

    const isGreeting = ['HI', 'HELLO', 'HEY', 'START', 'MENU', '0'].includes(upperText);

    // If human mode is active, block the bot from auto-replying unless they say MENU
    if (session.context && (session.context as any).isHumanPaused) {
      if (isGreeting) {
        // User wants to exit human mode and go back to bot
        await this.prisma.chatSession.update({
          where: { id: session.id },
          data: { step: 0, context: {} },
        });
        await this.sendMenu(jid, config);
        return;
      }
      // Silently ignore messages while human is handling
      return;
    }

    if (isGreeting) {
      await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { step: 0, context: {} },
      });
      await this.sendMenu(jid, config);
      return;
    }

    // Process Menu Options
    if (session.step === 0) {
      if (
        config.quickReplies?.status &&
        (upperText === '1' || upperText.includes('STATUS') || upperText.includes('WHERE'))
      ) {
        await this.handleStatusCheck(tenantId, phone, jid);
        return;
      }

      if (
        config.quickReplies?.cancel &&
        (upperText === '2' || upperText.includes('CANCEL') || upperText.includes('STOP'))
      ) {
        await this.handleCancel(tenantId, phone, jid);
        return;
      }

      if (
        config.quickReplies?.human &&
        (upperText === '3' || upperText.includes('HUMAN') || upperText.includes('AGENT') || upperText.includes('SUPPORT'))
      ) {
        await this.sendMsg(jid, 'I have paused automated replies. A human agent will respond to you shortly.');
        await this.prisma.chatSession.update({
          where: { id: session.id },
          data: { context: { isHumanPaused: true } },
        });
        return;
      }

      await this.sendMsg(jid, "I didn't understand that. Please reply '0' to see the menu again.");
      return;
    }
  }

  private async sendMenu(jid: string, config: any) {
    let msg = `*${config.botName}*\n\n${config.welcomeMessage}\n\n`;

    let optionNum = 1;
    if (config.quickReplies?.status) {
      msg += `${optionNum++}. Check my Queue Status\n`;
    }
    if (config.quickReplies?.cancel) {
      msg += `${optionNum++}. Cancel my Visit\n`;
    }
    if (config.quickReplies?.human) {
      msg += `${optionNum++}. Speak to a Human\n`;
    }

    if (optionNum === 1) {
      msg +=
        'No automated options are available at this time. Please type your message and someone will assist you.';
    }

    await this.sendMsg(jid, msg);
  }

  /**
   * FIX (1C): Migrated from deprecated `prisma.token` to `prisma.visit`.
   * The Token table is empty — all queue data now lives in the Visit model.
   * We find an active Visit by matching the customer's phone number against
   * the Customer record linked to the Visit.
   */
  private async handleStatusCheck(tenantId: string, phone: string, jid: string) {
    const visit = await this.prisma.visit.findFirst({
      where: {
        tenantId,
        customer: {
          // Match the phone number — strip leading/trailing spaces and handle country code variations
          phone: { contains: phone.replace(/\D/g, '').slice(-9) },
        },
        currentState: { in: ['WAITING', 'CHECKED_IN', 'IN_SERVICE'] },
      },
      include: {
        queue: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!visit) {
      await this.sendMsg(
        jid,
        "I couldn't find any active queue tickets for this number.\n\nReply '0' for the main menu.",
      );
      return;
    }

    if (visit.currentState === 'IN_SERVICE') {
      await this.sendMsg(
        jid,
        `Your ticket *${visit.displayId || 'Unknown'}* is currently being served!\n\nPlease proceed to the service counter now.`,
      );
      return;
    }

    // Calculate position — count visits created before this one that are still waiting
    const position = await this.prisma.visit.count({
      where: {
        queueId: visit.queueId,
        currentState: { in: ['WAITING', 'CHECKED_IN'] },
        createdAt: { lt: visit.createdAt },
      },
    });

    const queueName = visit.queue?.name || 'queue';
    const serviceName = visit.service?.name || '';
    const serviceText = serviceName ? `\nService: *${serviceName}*` : '';

    await this.sendMsg(
      jid,
      `Ticket: *${visit.displayId || 'Pending'}*\nQueue: *${queueName}*${serviceText}\n\nThere are *${position}* people ahead of you.\n\nReply '0' for the main menu.`,
    );
  }

  /**
   * FIX (1C): Migrated from deprecated `prisma.token` to `prisma.visit`.
   * Cancel by setting Visit.currentState to 'CANCELLED'.
   */
  private async handleCancel(tenantId: string, phone: string, jid: string) {
    const visit = await this.prisma.visit.findFirst({
      where: {
        tenantId,
        customer: {
          phone: { contains: phone.replace(/\D/g, '').slice(-9) },
        },
        currentState: { in: ['WAITING', 'CHECKED_IN'] },
      },
      include: {
        queue: { select: { name: true } },
      },
    });

    if (!visit) {
      await this.sendMsg(
        jid,
        "I couldn't find any active tickets to cancel for this number.\n\nReply '0' for the main menu.",
      );
      return;
    }

    await this.prisma.visit.update({
      where: { id: visit.id },
      data: {
        currentState: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    const queueName = visit.queue?.name || 'queue';
    await this.sendMsg(
      jid,
      `Your ticket *${visit.displayId || 'Unknown'}* in the *${queueName}* queue has been successfully cancelled.\n\nReply '0' for the main menu.`,
    );
  }
}
