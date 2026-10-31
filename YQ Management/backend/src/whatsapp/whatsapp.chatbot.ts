import { PrismaService } from '../prisma/prisma.service';
import { ServiceService } from '../service/service.service';
import { AppointmentService } from '../appointment/appointment.service';
import { VisitService } from '../visit/visit.service';

export class WhatsappChatbot {
  constructor(
    private prisma: PrismaService,
    private sendMsg: (jid: string, text: string) => Promise<void>,
    private sendListMsg: (jid: string, payload: any) => Promise<void>,
    private serviceService?: ServiceService,
    private appointmentService?: AppointmentService,
    private visitService?: VisitService,
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
        await this.updateSession(session.id, 0, {});
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
      let index = 1;
      const statusOption =
        config.quickReplies?.status !== false ? (index++).toString() : null;
      const humanOption =
        config.quickReplies?.human !== false ? (index++).toString() : null;
      const bookOption = (index++).toString();
      const cancelOption =
        config.quickReplies?.cancel !== false ? (index++).toString() : null;

      if (
        statusOption &&
        (upperText === statusOption ||
          upperText.includes('STATUS') ||
          upperText === 'check_status')
      ) {
        await this.handleStatusCheck(tenantId, phone, jid);
        return { handled: true, isHumanPaused: false };
      }

      if (
        upperText.includes('CHECKIN') ||
        upperText.includes('CHECK IN') ||
        upperText === 'CHECK-IN' ||
        upperText === 'check_in'
      ) {
        await this.handleAppointmentCheckin(tenantId, phone, jid);
        return { handled: true, isHumanPaused: false };
      }

      if (
        humanOption &&
        (upperText === humanOption ||
          upperText.includes('HUMAN') ||
          upperText.includes('AGENT') ||
          upperText.includes('SUPPORT') ||
          upperText === 'chat_human')
      ) {
        await this.sendMsg(
          jid,
          'I have paused automated replies. A human agent will respond to you shortly.',
        );
        await this.updateSession(session.id, undefined, {
          isHumanPaused: true,
        });
        return { handled: true, isHumanPaused: true }; // Trigger inbox saving
      }

      if (
        cancelOption &&
        (upperText === cancelOption ||
          upperText.includes('CANCEL') ||
          upperText === 'cancel_ticket')
      ) {
        await this.handleCancel(tenantId, phone, jid);
        return { handled: true, isHumanPaused: false };
      }

      if (
        upperText === bookOption ||
        upperText.includes('BOOK') ||
        upperText.includes('APPOINTMENT') ||
        upperText === 'book_new'
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

    if (session.step === 20) {
      await this.handleReviewRating(tenantId, phone, jid, session, text);
      return { handled: true, isHumanPaused: false };
    }

    // Fallback: If they typed something we didn't understand, reset step and show menu
    await this.updateSession(session.id, 0, {});

    if (
      ['[IMAGE]', '[AUDIO]', '[VIDEO]', '[DOCUMENT]', '[STICKER]'].includes(
        upperText,
      )
    ) {
      await this.sendMsg(
        jid,
        'I am an automated assistant and cannot process media files like images or audio right now. Please select an option from the menu below:',
      );
    }

    await this.sendMenu(jid, config);
    return { handled: true, isHumanPaused: false };
  }

  private async sendMenu(jid: string, config: any) {
    const botName = config?.botName || 'Assistant';
    const welcome =
      config?.welcomeMessage || 'Hi there! How can I help you today?';

    let msg = `*${botName}*\n\n${welcome}\n\n`;

    const quickReplies = config?.quickReplies || {
      status: true,
      cancel: true,
      human: true,
    };

    let index = 1;
    if (quickReplies.status !== false) {
      msg += `${index++}. Check Status\n`;
    }
    if (quickReplies.human !== false) {
      msg += `${index++}. Chat with Human\n`;
    }
    msg += `${index++}. Book an Appointment\n`;
    if (quickReplies.cancel !== false) {
      msg += `${index++}. Cancel Ticket\n`;
    }
    msg += `\nReply with a number to proceed.`;

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
    const cleanPhone = phone.replace(/\D/g, '').slice(-9);

    const visit = await this.prisma.visit.findFirst({
      where: {
        tenantId,
        customer: {
          phone: { contains: cleanPhone },
        },
        currentState: { in: ['WAITING', 'CHECKED_IN', 'IN_SERVICE'] },
      },
      include: {
        queue: { select: { name: true } },
        service: { select: { name: true, basePrice: true } },
        location: { select: { name: true } },
        visitSteps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!visit) {
      // Check if user has an upcoming appointment scheduled for TODAY
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayAppt = await this.prisma.appointment.findFirst({
        where: {
          tenantId,
          customer: { phone: { contains: cleanPhone } },
          scheduledStart: { gte: todayStart, lte: todayEnd },
          status: { in: ['CONFIRMED', 'SCHEDULED'] },
        },
        include: {
          service: { select: { name: true } },
          location: { select: { name: true } },
        },
        orderBy: { scheduledStart: 'asc' },
      });

      if (todayAppt) {
        const timeStr = new Date(todayAppt.scheduledStart).toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          },
        );
        const serviceName = todayAppt.service?.name || 'Appointment';
        const locName = todayAppt.location?.name
          ? ` at *${todayAppt.location.name}*`
          : '';

        await this.sendMsg(
          jid,
          `📅 *Upcoming Appointment Today*\n\n` +
            `Service: *${serviceName}*${locName}\n` +
            `Time: *${timeStr}*\n` +
            `Status: *${todayAppt.status}*\n\n` +
            `Ready to join the queue? Reply *CHECKIN* to check in now and receive your live ticket!`,
        );
        return;
      }

      await this.sendMsg(
        jid,
        "I couldn't find any active queue tickets or appointments scheduled for today under this number.\n\nReply '0' for the main menu.",
      );
      return;
    }

    const baseAppUrl =
      process.env.APP_URL ||
      (process.env.DOMAIN_BASE
        ? `https://${process.env.DOMAIN_BASE}`
        : 'https://qmova.yqbuddy.com');
    const trackerUrl = `${baseAppUrl}/customer/status/${visit.id}`;

    if (visit.currentState === 'IN_SERVICE') {
      let inServiceMsg = `🟢 *Your ticket ${visit.displayId || 'Unknown'} is currently being served!*\n\n`;
      if (visit.service?.name)
        inServiceMsg += `Service: *${visit.service.name}*\n`;
      if (visit.location?.name)
        inServiceMsg += `Location: *${visit.location.name}*\n`;
      inServiceMsg += `\nPlease proceed to the service counter now.\n\n📲 Live Tracker:\n🔗 ${trackerUrl}`;
      await this.sendMsg(jid, inServiceMsg);
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

    const queueName = visit.queue?.name || 'Main Queue';
    const serviceName = visit.service?.name || '';
    const locName = visit.location?.name || '';

    let msg = `🎫 *Live Ticket: ${visit.displayId || 'In Queue'}*\n`;
    if (locName) msg += `📍 Location: *${locName}*\n`;
    if (serviceName) msg += `💼 Service: *${serviceName}*\n`;
    msg += `👥 Queue: *${queueName}*\n\n`;

    msg += `⏳ *Status:* Waiting in Queue\n`;
    msg += `🔢 Ahead of you: *${position}* ${position === 1 ? 'person' : 'people'}\n`;

    // Multi-stage Journey Builder inspection
    const steps = visit.visitSteps;
    if (steps && steps.length > 0) {
      const totalSteps = steps.length;
      const activeStep: any =
        steps.find((s: any) => s.status === 'ACTIVE') ||
        steps.find((s: any) => s.status === 'QUEUED') ||
        steps.find((s: any) => s.status === 'PENDING') ||
        steps[0];
      const activeIdx = steps.findIndex((s: any) => s.id === activeStep?.id);

      if (totalSteps > 1) {
        msg += `\n🔄 *Journey Progress:* Stage ${activeIdx + 1} of ${totalSteps}\n`;
        msg += `📍 Current Stage: *${activeStep.name || activeStep.type}*\n`;
        if (activeIdx + 1 < totalSteps) {
          const nextStep = steps[activeIdx + 1];
          msg += `➡️ Next Up: ${nextStep.name || nextStep.type}\n`;
        }
      }

      if (
        activeStep?.type === 'PAYMENT' &&
        activeStep.paymentStatus !== 'PAID' &&
        activeStep.amountCharged
      ) {
        const amountFormatted = (activeStep.amountCharged / 100).toFixed(2);
        msg += `\n💳 *Payment Due: R${amountFormatted}*\n`;
        msg += `Please pay at the counter or complete payment online:\n🔗 ${trackerUrl}\n`;
      }
    }

    msg += `\n📲 *Live Updates & Mobile Calling:*\n🔗 ${trackerUrl}\n\n`;
    msg += `Reply '0' for the main menu.`;

    await this.sendMsg(jid, msg);
  }

  /**
   * 1-Click WhatsApp Check-in for Today's Scheduled Appointments
   */
  private async handleAppointmentCheckin(
    tenantId: string,
    phone: string,
    jid: string,
  ) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-9);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const appt = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        customer: { phone: { contains: cleanPhone } },
        scheduledStart: { gte: todayStart, lte: todayEnd },
        status: { in: ['CONFIRMED', 'SCHEDULED'] },
      },
      include: {
        customer: true,
        service: true,
        location: true,
      },
      orderBy: { scheduledStart: 'asc' },
    });

    if (!appt) {
      await this.sendMsg(
        jid,
        `I couldn't find an appointment scheduled for today under this phone number.\n\nReply *0* for the main menu to check status or book an appointment.`,
      );
      return;
    }

    // Check if customer already has an active visit
    if (appt.customerId) {
      const existingVisit = await this.prisma.visit.findFirst({
        where: {
          tenantId,
          customerId: appt.customerId,
          currentState: { in: ['WAITING', 'CHECKED_IN', 'IN_SERVICE'] },
        },
      });

      if (existingVisit) {
        await this.sendMsg(
          jid,
          `You are already checked in with Ticket *${existingVisit.displayId}*!\n\nReply *1* to check your live queue position and journey status.`,
        );
        return;
      }
    }

    // Determine target queue
    const queue = await this.prisma.queue.findFirst({
      where: {
        tenantId,
        locationId: appt.locationId,
        status: 'ACTIVE',
      },
    });

    if (!queue) {
      await this.sendMsg(
        jid,
        `⚠️ Could not automatically check you in: no open queue found for this location. Please approach the front desk.`,
      );
      return;
    }

    try {
      let createdVisit: any = null;
      if (this.visitService) {
        createdVisit = await this.visitService.joinQueue(queue.id, {
          name: appt.customer?.name || 'Guest',
          phone: appt.customer?.phone || phone,
          serviceId: appt.serviceId,
        });
        if (createdVisit?.id) {
          await this.prisma.visit.update({
            where: { id: createdVisit.id },
            data: { appointmentId: appt.id },
          });
        }
      }

      if (!createdVisit) {
        throw new Error('Could not create queue ticket');
      }

      // Mark appointment as checked in
      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'CHECKED_IN' },
      });

      const baseAppUrl =
        process.env.APP_URL ||
        (process.env.DOMAIN_BASE
          ? `https://${process.env.DOMAIN_BASE}`
          : 'https://qmova.yqbuddy.com');
      const trackerUrl = `${baseAppUrl}/customer/status/${createdVisit.id}`;

      await this.sendMsg(
        jid,
        `✅ *Check-In Successful!*\n\n` +
          `🎫 Ticket Number: *${createdVisit.displayId || 'Checked In'}*\n` +
          `💼 Service: *${appt.service?.name || 'General'}*\n` +
          `📍 Location: *${appt.location?.name || 'Main Branch'}*\n\n` +
          `You have joined the queue. You can track your position live and be notified when called here:\n` +
          `🔗 ${trackerUrl}\n\n` +
          `Reply *1* at any time to check your status.`,
      );
    } catch (err: any) {
      await this.sendMsg(
        jid,
        `Sorry, we encountered an error checking you in. Please see the front desk for assistance.`,
      );
    }
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
        tenant: true,
      },
    });

    if (!visit) {
      await this.sendMsg(
        jid,
        "I couldn't find any active tickets to cancel for this number.\n\nReply '0' for the main menu.",
      );
      return;
    }

    const hasPayment = await this.prisma.bookingPayment.findFirst({
      where: { visitId: visit.id, status: 'SUCCEEDED' },
    });

    if (hasPayment) {
      const tenantEmail = visit.tenant.supportEmail || 'the business directly';
      await this.sendMsg(
        jid,
        `Your ticket *${visit.displayId || 'Unknown'}* has an active payment and cannot be cancelled automatically.\n\nPlease contact ${tenantEmail} for assistance with cancellations and refunds.\n\nReply '0' for the main menu.`,
      );
      return;
    }

    const existingMeta =
      typeof visit.metadata === 'object' && visit.metadata !== null
        ? (visit.metadata as Record<string, any>)
        : {};

    const updated = await this.prisma.visit.update({
      where: { id: visit.id },
      data: {
        currentState: 'CANCELLED',
        completedAt: new Date(),
        cancelledBy: 'CUSTOMER',
        cancelReason: 'Cancelled by customer via WhatsApp',
        metadata: {
          ...existingMeta,
          cancellation: {
            reason: 'Cancelled by customer via WhatsApp',
            category: 'CUSTOMER_REQUEST',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'CUSTOMER',
          },
        },
      },
    });

    if (visit.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: visit.appointmentId },
        data: { status: 'CANCELLED' },
      }).catch(() => null);
    }

    await this.prisma.outboxEvent.create({
      data: {
        type: 'VISIT_CANCELLED',
        payload: {
          visitId: updated.id,
          queueId: updated.queueId,
          tenantId: updated.tenantId,
          cancelledBy: 'CUSTOMER',
          cancelReason: 'Cancelled by customer via WhatsApp',
          reasonCategory: 'CUSTOMER_REQUEST',
        },
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
      await this.updateSession(session.id, 11, { locationId: locations[0].id });
      await this.promptServices(tenantId, locations[0].id, jid, session);
      return;
    }

    // Multiple locations: Prompt location selection
    let msg = `Please select a location:\n\n`;
    locations.forEach((loc, index) => {
      msg += `${index + 1}. ${loc.name}\n`;
    });
    msg += `\nReply with a number, or '0' to cancel.`;

    await this.updateSession(session.id, 10, {
      locations: locations.map((l) => l.id),
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
    const ctx = session.context;
    const locations = ctx.locations || [];
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= locations.length) {
      await this.sendMsg(
        jid,
        'Invalid selection. Please reply with a valid number.',
      );
      return;
    }

    const locationId = locations[index];
    await this.updateSession(session.id, 11, {
      locationId,
      locations: undefined,
    });

    await this.promptServices(tenantId, locationId, jid, session);
  }

  private async promptServices(
    tenantId: string,
    locationId: string,
    jid: string,
    session: any,
  ) {
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

    await this.updateSession(session.id, undefined, {
      services: services.map((s) => s.id),
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
    const ctx = session.context;
    // To safely merge, we should retrieve the latest session first, but we have session here.
    // Wait, promptServices used updateMany which doesn't merge context, it overwrites it.
    // I need to retrieve session again or merge properly.
    const currentSession = await this.prisma.chatSession.findUnique({
      where: { id: session.id },
    });
    const currentCtx = (currentSession?.context as any) || {};
    const services = currentCtx.services || [];
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= services.length) {
      await this.sendMsg(
        jid,
        'Invalid selection. Please reply with a valid number.',
      );
      return;
    }

    const serviceId = services[index];

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { location: true },
    });
    const timezone = service?.location?.timezone || 'UTC';

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const now = new Date();
    const todayStr = formatter.format(now);

    // Tomorrow
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = formatter.format(tomorrowDate);

    // Prompt date (dynamically finding dates with available slots)
    const availableDates: string[] = [];
    const maxDaysToCheck = 14;
    let daysChecked = 0;
    const dateToCheck = new Date(now);

    if (!this.serviceService) {
      await this.sendMsg(jid, 'Booking service unavailable at this moment.');
      return;
    }

    while (availableDates.length < 3 && daysChecked < maxDaysToCheck) {
      const dateStr = formatter.format(dateToCheck);
      const slots = await this.serviceService.getAvailableSlots(
        serviceId,
        dateStr,
      );

      let hasAvailable = false;
      if (slots && slots.length > 0) {
        if (dateStr === todayStr) {
          hasAvailable = slots.some(
            (s) => new Date(s.time) > now && s.available,
          );
        } else {
          hasAvailable = slots.some((s) => s.available);
        }
      }

      if (hasAvailable) {
        // Prevent duplicate push if same formatted date happens twice during daylight savings transitions
        if (!availableDates.includes(dateStr)) {
          availableDates.push(dateStr);
        }
      }

      dateToCheck.setDate(dateToCheck.getDate() + 1);
      daysChecked++;
    }

    if (availableDates.length === 0) {
      await this.sendMsg(
        jid,
        'No available dates found in the next 14 days. Please try again later.',
      );
      return;
    }

    let msg = `When would you like to book?\n\n`;
    availableDates.forEach((d, i) => {
      const isToday = d === todayStr;
      const isTomorrow = d === tomorrowStr;

      let label = d;
      if (isToday) label = `Today (${d})`;
      else if (isTomorrow) label = `Tomorrow (${d})`;
      else {
        const localDate = new Date(d + 'T00:00:00');
        const dayOfWeek = localDate.toLocaleDateString('en-US', {
          weekday: 'long',
        });
        label = `${dayOfWeek} (${d})`;
      }

      msg += `${i + 1}. ${label}\n`;
    });
    msg += `\nReply with a number, or '0' to cancel.`;

    await this.updateSession(session.id, 12, {
      serviceId,
      dates: availableDates,
      services: undefined,
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
    const ctx = session.context;
    const dates = ctx.dates || [];
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= dates.length) {
      await this.sendMsg(
        jid,
        'Invalid selection. Please reply with 1, 2, or 3.',
      );
      return;
    }

    const date = dates[index];
    const serviceId = ctx.serviceId;

    if (!this.serviceService) {
      await this.sendMsg(jid, 'Booking service unavailable at this moment.');
      return;
    }

    const slots = await this.serviceService.getAvailableSlots(serviceId, date);

    if (!slots || slots.length === 0) {
      await this.sendMsg(
        jid,
        `No slots available on ${date}. Please reply '0' to start over.`,
      );
      return;
    }

    // List next 5 slots starting from now if today
    const now = new Date();
    // Use .time instead of .start
    const futureSlots = slots
      .filter((s) => new Date(s.time) > now && s.available)
      .slice(0, 5);

    if (futureSlots.length === 0) {
      await this.sendMsg(
        jid,
        `No more slots available today. Please reply '0' to start over.`,
      );
      return;
    }

    let msg = `Available time slots for ${date}:\n\n`;
    futureSlots.forEach((slot, i) => {
      msg += `${i + 1}. ${new Date(slot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    });
    msg += `\nReply with a number, or '0' to cancel.`;

    await this.updateSession(session.id, 13, {
      date,
      slots: futureSlots,
      dates: undefined,
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
    const ctx = session.context;
    const slots = ctx.slots || [];
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= slots.length) {
      await this.sendMsg(
        jid,
        'Invalid selection. Please reply with a valid number.',
      );
      return;
    }

    const selectedSlot = slots[index];

    await this.updateSession(session.id, 14, {
      selectedSlot,
      slots: undefined,
    });

    await this.sendMsg(
      jid,
      'Great! Finally, please reply with your full name to confirm the booking.',
    );
  }

  private async handleFinalizeBooking(
    tenantId: string,
    phone: string,
    jid: string,
    session: any,
    text: string,
  ) {
    const ctx = session.context;
    const name = text.trim();

    if (!name || name.length < 2) {
      await this.sendMsg(jid, 'Please provide a valid name.');
      return;
    }

    if (!this.appointmentService) {
      await this.sendMsg(jid, 'Booking service unavailable at this moment.');
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
      const srv = await this.prisma.service.findUnique({
        where: { id: ctx.serviceId },
      });
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

      const formattedTime = start.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      await this.sendMsg(
        jid,
        `✅ Booking Confirmed!\n\nName: ${name}\nTime: ${formattedTime}\n\nWe look forward to seeing you. Reply '0' for the main menu.`,
      );
    } catch (e) {
      await this.sendMsg(
        jid,
        'Sorry, there was an error confirming your booking. Please try again later.',
      );
    }

    await this.updateSession(session.id, 0, {});
  }

  private async handleReviewRating(
    tenantId: string,
    phone: string,
    jid: string,
    session: any,
    text: string,
  ) {
    const rating = parseInt(text.trim());

    if (isNaN(rating) || rating < 1 || rating > 5) {
      await this.sendMsg(jid, 'Please reply with a valid number from 1 to 5.');
      return;
    }

    // Find the pending review request
    const reviewRequest = await this.prisma.reviewRequest.findFirst({
      where: {
        tenantId,
        customer: { phone },
        status: 'SENT',
      },
      orderBy: { sentAt: 'desc' },
    });

    if (reviewRequest) {
      await this.prisma.reviewRequest.update({
        where: { id: reviewRequest.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          rating,
          source: 'INTERNAL',
        },
      });

      // Update visit as well for legacy compatibility
      await this.prisma.visit.update({
        where: { id: reviewRequest.visitId },
        data: { rating },
      });
    }

    if (rating <= 3) {
      await this.prisma.message.create({
        data: {
          tenantId,
          customerPhone: phone,
          body: `🚨 Low Score Alert: Customer rated their experience ${rating}/5.`,
          sender: 'SYSTEM',
          isRead: false,
        },
      });
      await this.sendMsg(
        jid,
        "Thank you for your feedback. We are sorry your experience wasn't perfect. Our team has been notified and we will strive to do better next time.",
      );
    } else {
      await this.sendMsg(jid, 'Thank you for your fantastic feedback!');
    }

    await this.updateSession(session.id, 0, {});
  }

  private async updateSession(
    sessionId: string,
    step: number | undefined,
    updates: Record<string, any>,
  ) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    const currentContext = (session?.context as object) || {};
    const newContext = { ...currentContext, ...updates };

    for (const key of Object.keys(newContext)) {
      if (newContext[key] === undefined) delete newContext[key];
    }

    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        ...(step !== undefined ? { step } : {}),
        context: newContext,
      },
    });
  }
}
