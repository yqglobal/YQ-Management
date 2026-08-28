import { PrismaService } from '../prisma/prisma.service';
import { ServiceService } from '../service/service.service';
import { AppointmentService } from '../appointment/appointment.service';

export class WhatsappChatbot {
  constructor(
    private prisma: PrismaService,
    private sendMsg: (jid: string, text: string) => Promise<void>,
    private serviceService?: ServiceService,
    private appointmentService?: AppointmentService,
  ) {}

  async process(
    tenant: any,
    phone: string,
    jid: string,
    rawText: string,
  ): Promise<{ handled: boolean; isHumanPaused: boolean }> {
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

    const isGreeting = ['HI', 'HELLO', 'HEY', 'START', 'MENU', '0'].includes(
      upperText,
    );
    const isTransactionalReply = [
      'OK',
      'OKAY',
      'THANKS',
      'THANK YOU',
      '👍',
    ].includes(upperText);

    // If human mode is active, block the bot from auto-replying unless they say MENU
    if (session.context && (session.context as any).isHumanPaused) {
      if (isGreeting) {
        // User wants to exit human mode and go back to bot
        await this.prisma.chatSession.update({
          where: { id: session.id },
          data: { step: 0, context: {} },
        });
        await this.sendMenu(jid, config);
        return { handled: true, isHumanPaused: false };
      }
      // Return that it's paused so the service can log it
      return { handled: true, isHumanPaused: true };
    }

    if (isTransactionalReply) {
      // Just ignore it entirely to not annoy the customer when they say Thanks to automated alerts
      return { handled: true, isHumanPaused: false };
    }

    if (isGreeting) {
      await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { step: 0, context: {} },
      });
      await this.sendMenu(jid, config);
      return { handled: true, isHumanPaused: false };
    }

    // Process Menu Options
    if (session.step === 0) {
      if (
        config.quickReplies?.status &&
        (upperText === '1' ||
          upperText.includes('STATUS') ||
          upperText.includes('WHERE'))
      ) {
        await this.handleStatusCheck(tenantId, phone, jid);
        return { handled: true, isHumanPaused: false };
      }

      if (
        config.quickReplies?.cancel &&
        (upperText === '2' ||
          upperText.includes('CANCEL') ||
          upperText.includes('STOP'))
      ) {
        await this.handleCancel(tenantId, phone, jid);
        return { handled: true, isHumanPaused: false };
      }

      if (
        config.quickReplies?.human &&
        (upperText === '3' ||
          upperText.includes('HUMAN') ||
          upperText.includes('AGENT') ||
          upperText.includes('SUPPORT'))
      ) {
        await this.sendMsg(
          jid,
          'I have paused automated replies. A human agent will respond to you shortly.',
        );
        await this.prisma.chatSession.update({
          where: { id: session.id },
          data: { context: { isHumanPaused: true } },
        });
        return { handled: true, isHumanPaused: true }; // Trigger inbox saving
      }
      if (
        upperText === '4' ||
        upperText.includes('BOOK') ||
        upperText.includes('APPOINTMENT')
      ) {
        await this.handleBookingStart(tenantId, phone, jid, session);
        return { handled: true, isHumanPaused: false };
      }
    }

    if (session.step === 10) {
      await this.handleLocationSelection(tenantId, phone, jid, session, text);
      return { handled: true, isHumanPaused: false };
    }

    if (session.step === 11) {
      await this.handleServiceSelection(tenantId, phone, jid, session, text);
      return { handled: true, isHumanPaused: false };
    }

    if (session.step === 12) {
      await this.handleDateSelection(tenantId, phone, jid, session, text);
      return { handled: true, isHumanPaused: false };
    }

    if (session.step === 13) {
      await this.handleTimeSelection(tenantId, phone, jid, session, text);
      return { handled: true, isHumanPaused: false };
    }

    if (session.step === 14) {
      await this.handleFinalizeBooking(tenantId, phone, jid, session, text);
      return { handled: true, isHumanPaused: false };
    }

    // Fallback: If they typed something we didn't understand, prompt them
    await this.sendMsg(
      jid,
      "I didn't understand that. Please reply '0' or 'Hi' to see the main menu.",
    );
    return { handled: true, isHumanPaused: false };
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
    
    // Always append booking as an option
    msg += `4. Book an Appointment\n`;

    await this.sendMsg(jid, msg);
  }

  /**
   * FIX (1C): Migrated from deprecated `prisma.token` to `prisma.visit`.
   * The Token table is empty — all queue data now lives in the Visit model.
   * We find an active Visit by matching the customer's phone number against
   * the Customer record linked to the Visit.
   */
  private async handleStatusCheck(
    tenantId: string,
    phone: string,
    jid: string,
  ) {
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
  private async handleBookingStart(
    tenantId: string,
    phone: string,
    jid: string,
    session: any,
  ) {
    const locations = await this.prisma.location.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    if (locations.length === 0) {
      await this.sendMsg(
        jid,
        "Booking is currently unavailable (no locations setup).\n\nReply '0' for the main menu.",
      );
      return;
    }

    if (locations.length === 1) {
      // Skip location selection if only one exists
      await this.prisma.chatSession.update({
        where: { id: session.id },
        data: {
          step: 11,
          context: { ...((session.context as any) || {}), locationId: locations[0].id },
        },
      });
      await this.promptServices(tenantId, locations[0].id, jid);
      return;
    }

    // Multiple locations: Prompt location selection
    let msg = `Please select a location:\n\n`;
    locations.forEach((loc, index) => {
      msg += `${index + 1}. ${loc.name}\n`;
    });
    msg += `\nReply with a number, or '0' to cancel.`;

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        step: 10,
        context: { ...((session.context as any) || {}), locations: locations.map(l => l.id) },
      },
    });

    await this.sendMsg(jid, msg);
  }

  private async handleLocationSelection(
    tenantId: string,
    phone: string,
    jid: string,
    session: any,
    text: string,
  ) {
    const ctx = session.context as any;
    const locations = ctx.locations || [];
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= locations.length) {
      await this.sendMsg(jid, "Invalid selection. Please reply with a valid number.");
      return;
    }

    const locationId = locations[index];
    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        step: 11,
        context: { ...ctx, locationId, locations: undefined },
      },
    });

    await this.promptServices(tenantId, locationId, jid);
  }

  private async promptServices(tenantId: string, locationId: string, jid: string) {
    const services = await this.prisma.service.findMany({
      where: { tenantId, locationId: locationId },
      orderBy: { name: 'asc' },
    });

    if (services.length === 0) {
      await this.sendMsg(
        jid,
        "No services available at this location.\n\nReply '0' for the main menu.",
      );
      return;
    }

    let msg = `Please select a service:\n\n`;
    services.forEach((s, index) => {
      msg += `${index + 1}. ${s.name}\n`;
    });
    msg += `\nReply with a number, or '0' to cancel.`;

    await this.prisma.chatSession.updateMany({
      where: { tenantId, phone: jid.split('@')[0] },
      data: {
        context: { services: services.map(s => s.id) },
      },
    });

    await this.sendMsg(jid, msg);
  }

  private async handleServiceSelection(
    tenantId: string,
    phone: string,
    jid: string,
    session: any,
    text: string,
  ) {
    const ctx = session.context as any;
    // To safely merge, we should retrieve the latest session first, but we have session here.
    // Wait, promptServices used updateMany which doesn't merge context, it overwrites it.
    // I need to retrieve session again or merge properly.
    const currentSession = await this.prisma.chatSession.findUnique({
      where: { id: session.id }
    });
    const currentCtx = (currentSession?.context as any) || {};
    const services = currentCtx.services || [];
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= services.length) {
      await this.sendMsg(jid, "Invalid selection. Please reply with a valid number.");
      return;
    }

    const serviceId = services[index];
    
    // Prompt date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const dates = [
      today.toISOString().split('T')[0],
      tomorrow.toISOString().split('T')[0],
      dayAfter.toISOString().split('T')[0]
    ];

    let msg = `When would you like to book?\n\n`;
    msg += `1. Today (${dates[0]})\n`;
    msg += `2. Tomorrow (${dates[1]})\n`;
    msg += `3. Day after tomorrow (${dates[2]})\n`;
    msg += `\nReply with a number, or '0' to cancel.`;

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        step: 12,
        context: { ...currentCtx, serviceId, dates, services: undefined },
      },
    });

    await this.sendMsg(jid, msg);
  }

  private async handleDateSelection(
    tenantId: string,
    phone: string,
    jid: string,
    session: any,
    text: string,
  ) {
    const ctx = session.context as any;
    const dates = ctx.dates || [];
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= dates.length) {
      await this.sendMsg(jid, "Invalid selection. Please reply with 1, 2, or 3.");
      return;
    }

    const date = dates[index];
    const serviceId = ctx.serviceId;

    if (!this.serviceService) {
      await this.sendMsg(jid, "Booking service unavailable at this moment.");
      return;
    }

    const slots = await this.serviceService.getAvailableSlots(serviceId, date);
    
    if (!slots || slots.length === 0) {
      await this.sendMsg(jid, `No slots available on ${date}. Please reply '0' to start over.`);
      return;
    }

    // List next 5 slots starting from now if today
    const now = new Date();
    // Use .time instead of .start
    const futureSlots = slots.filter(s => new Date(s.time) > now && s.available).slice(0, 5);

    if (futureSlots.length === 0) {
      await this.sendMsg(jid, `No more slots available today. Please reply '0' to start over.`);
      return;
    }

    let msg = `Available time slots for ${date}:\n\n`;
    futureSlots.forEach((slot, i) => {
      msg += `${i + 1}. ${new Date(slot.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`;
    });
    msg += `\nReply with a number, or '0' to cancel.`;

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        step: 13,
        context: { ...ctx, date, slots: futureSlots, dates: undefined },
      },
    });

    await this.sendMsg(jid, msg);
  }

  private async handleTimeSelection(
    tenantId: string,
    phone: string,
    jid: string,
    session: any,
    text: string,
  ) {
    const ctx = session.context as any;
    const slots = ctx.slots || [];
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= slots.length) {
      await this.sendMsg(jid, "Invalid selection. Please reply with a valid number.");
      return;
    }

    const selectedSlot = slots[index];

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        step: 14,
        context: { ...ctx, selectedSlot, slots: undefined },
      },
    });

    await this.sendMsg(jid, "Great! Finally, please reply with your full name to confirm the booking.");
  }

  private async handleFinalizeBooking(
    tenantId: string,
    phone: string,
    jid: string,
    session: any,
    text: string,
  ) {
    const ctx = session.context as any;
    const name = text.trim();

    if (!name || name.length < 2) {
      await this.sendMsg(jid, "Please provide a valid name.");
      return;
    }

    if (!this.appointmentService) {
      await this.sendMsg(jid, "Booking service unavailable at this moment.");
      return;
    }

    // Find or create customer
    const cleanPhone = phone.replace(/\D/g, '').slice(-9);
    let customer = await this.prisma.customer.findFirst({
      where: { tenantId, phone: { contains: cleanPhone } },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { tenantId, name, phone },
      });
    } else {
      if (!customer.name || customer.name === 'Walk-in') {
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: { name },
        });
      }
    }

    const start = new Date(ctx.selectedSlot.time);
    
    // Fetch service for expected duration
    let durationMins = 30;
    if (ctx.serviceId) {
      const srv = await this.prisma.service.findUnique({ where: { id: ctx.serviceId } });
      if (srv && srv.expectedDuration) durationMins = srv.expectedDuration;
    }
    const end = new Date(start.getTime() + durationMins * 60000);

    try {
      await this.appointmentService.create({
        tenantId,
        customerId: customer.id,
        locationId: ctx.locationId,
        serviceId: ctx.serviceId,
        scheduledStart: start,
        scheduledEnd: end,
        bookingSource: 'WHATSAPP',
      });

      const formattedTime = start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      await this.sendMsg(jid, `✅ Booking Confirmed!\n\nName: ${name}\nTime: ${formattedTime}\n\nWe look forward to seeing you. Reply '0' for the main menu.`);
    } catch (e) {
      await this.sendMsg(jid, "Sorry, there was an error confirming your booking. Please try again later.");
    }

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: { step: 0, context: {} },
    });
  }
}
