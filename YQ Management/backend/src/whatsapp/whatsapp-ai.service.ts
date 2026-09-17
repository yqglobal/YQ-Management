import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ServiceService } from '../service/service.service';
import { AppointmentService } from '../appointment/appointment.service';

@Injectable()
export class WhatsappAiService {
  private readonly logger = new Logger(WhatsappAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly serviceService: ServiceService,
    private readonly appointmentService: AppointmentService,
  ) {}

  async processMessage(
    tenant: any,
    phone: string,
    jid: string,
    rawText: string,
    sendMessageFn: (jid: string, text: string) => Promise<void>,
  ): Promise<{ handled: boolean; isHumanPaused: boolean }> {
    const tenantId = tenant.id;

    // Check if human paused
    let session = await this.prisma.chatSession.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });

    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { tenantId, phone, step: 0 },
      });
    }

    if (session.context && (session.context as any).isHumanPaused) {
      const upperText = rawText.trim().toUpperCase();
      const isGreeting = ['HI', 'HELLO', 'HEY', 'START', 'MENU', '0'].includes(upperText);
      if (isGreeting) {
        await this.prisma.chatSession.update({
          where: { id: session.id },
          data: { context: { ...((session.context as object) || {}), isHumanPaused: false } },
        });
        await sendMessageFn(jid, "You are back in automated mode. How can I help you?");
        return { handled: true, isHumanPaused: false };
      }
      return { handled: true, isHumanPaused: true };
    }

    // Configure Gemini Tools
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'getQueuePosition',
            description: 'Check the customers current position in the queue. No arguments needed, uses the customers phone number.',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
          },
          {
            name: 'getWaitTime',
            description: 'Get an estimated wait time for the customer based on their current queue position.',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
          },
          {
            name: 'cancelVisit',
            description: 'Cancel the customers current ticket/visit in the queue.',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
          },
          {
            name: 'bookAppointment',
            description: 'Book an appointment for a service. Use this when the user says they want to book.',
            parameters: {
              type: 'OBJECT',
              properties: {
                date: { type: 'STRING', description: 'YYYY-MM-DD format date' },
                time: { type: 'STRING', description: 'HH:MM format time (24 hour)' },
                serviceName: { type: 'STRING', description: 'Name of the service (optional)' },
              },
            },
          },
          {
            name: 'transferToHuman',
            description: 'Transfer the conversation to a human operator. Use this if the user asks for a human, or if you cannot help them.',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
          }
        ]
      }
    ];

    const systemInstruction = `You are a helpful AI assistant for a business named ${tenant.name}. 
Your job is to assist customers with queue status, bookings, and general inquiries via WhatsApp.
Keep responses short, friendly, and conversational. Do not use markdown (except *bold* or _italic_ supported by WhatsApp).
Always try to use the provided tools if the user is asking about their queue status, wait time, or wants to cancel.
If they want to book an appointment, ask for the date, time, and service if not provided, then call bookAppointment.
If you don't know the answer or the user is frustrated, call transferToHuman.`;

    const interactionId = (session.context as any)?.interactionId;
    
    // Call AI
    const aiResponse = await this.aiService.getAiResponse(
      tenantId,
      phone,
      rawText,
      tools,
      systemInstruction,
      interactionId,
    );

    // Save interaction ID for stateful conversation
    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        context: { ...((session.context as object) || {}), interactionId: aiResponse.interactionId }
      }
    });

    let currentInteractionId = aiResponse.interactionId;
    let finalResponseText = aiResponse.responseText;
    let currentToolCalls = aiResponse.toolCalls;

    // Execute tool calls sequentially
    while (currentToolCalls && currentToolCalls.length > 0) {
      for (const call of currentToolCalls) {
        const { id, name, args } = call.functionCall;
        
        let result: any = { error: 'Unknown tool' };
        try {
          if (name === 'getQueuePosition') {
            result = await this.executeGetQueuePosition(tenantId, phone);
          } else if (name === 'getWaitTime') {
            result = await this.executeGetWaitTime(tenantId, phone);
          } else if (name === 'cancelVisit') {
            result = await this.executeCancelVisit(tenantId, phone);
          } else if (name === 'bookAppointment') {
            result = await this.executeBookAppointment(tenantId, phone, args);
          } else if (name === 'transferToHuman') {
            await this.prisma.chatSession.update({
              where: { id: session.id },
              data: { context: { ...((session.context as object) || {}), isHumanPaused: true } },
            });
            result = { success: true, message: 'Transferred to human operator' };
            await sendMessageFn(jid, "I have paused automated replies. A human agent will respond to you shortly.");
            return { handled: true, isHumanPaused: true };
          }
        } catch (err) {
          this.logger.error(`Tool execution failed for ${name}: ${err.message}`);
          result = { error: err.message };
        }

        // Return tool result to AI
        const followUp = await this.aiService.returnToolResult(currentInteractionId, id, name, result);
        finalResponseText = followUp.responseText;
        currentToolCalls = followUp.toolCalls;
      }
    }

    if (finalResponseText) {
      await sendMessageFn(jid, finalResponseText);
    }

    return { handled: true, isHumanPaused: false };
  }

  // --- Tool Implementations ---

  private async executeGetQueuePosition(tenantId: string, phone: string) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-9);
    const visit = await this.prisma.visit.findFirst({
      where: {
        tenantId,
        customer: { phone: { contains: cleanPhone } },
        currentState: { in: ['WAITING', 'CHECKED_IN', 'IN_SERVICE'] },
      },
      include: { queue: true, service: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!visit) return { found: false, message: 'No active tickets found.' };
    if (visit.currentState === 'IN_SERVICE') return { found: true, status: 'IN_SERVICE', message: 'You are currently being served.' };

    const position = await this.prisma.visit.count({
      where: {
        queueId: visit.queueId,
        currentState: { in: ['WAITING', 'CHECKED_IN'] },
        createdAt: { lt: visit.createdAt },
      },
    });

    return {
      found: true,
      queueName: visit.queue?.name,
      serviceName: visit.service?.name,
      positionAhead: position,
      ticketNumber: visit.displayId,
    };
  }

  private async executeGetWaitTime(tenantId: string, phone: string) {
    const posResult = await this.executeGetQueuePosition(tenantId, phone);
    if (!posResult.found) return posResult;
    if (posResult.status === 'IN_SERVICE') return posResult;

    // Simple estimation: 5 mins per person. Can be enhanced in C2.
    const estimatedMinutes = (posResult.positionAhead as number + 1) * 5;
    return {
      ...posResult,
      estimatedWaitTimeMinutes: estimatedMinutes,
    };
  }

  private async executeCancelVisit(tenantId: string, phone: string) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-9);
    const visit = await this.prisma.visit.findFirst({
      where: {
        tenantId,
        customer: { phone: { contains: cleanPhone } },
        currentState: { in: ['WAITING', 'CHECKED_IN'] },
      },
    });

    if (!visit) return { success: false, message: 'No active tickets to cancel.' };

    await this.prisma.visit.update({
      where: { id: visit.id },
      data: { currentState: 'CANCELLED', completedAt: new Date() },
    });

    return { success: true, message: `Ticket ${visit.displayId} cancelled.` };
  }

  private async executeBookAppointment(tenantId: string, phone: string, args: any) {
    const { date, time, serviceName } = args;
    if (!date || !time) return { success: false, message: 'Missing date or time.' };

    const cleanPhone = phone.replace(/\D/g, '').slice(-9);
    let customer = await this.prisma.customer.findFirst({
      where: { tenantId, phone: { contains: cleanPhone } },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { tenantId, phone, name: 'WhatsApp User' },
      });
    }

    // Default to first location and service if none specified or found
    const locations = await this.prisma.location.findMany({ where: { tenantId } });
    if (locations.length === 0) return { success: false, message: 'No locations configured.' };
    const locationId = locations[0].id;

    let serviceId = null;
    const services = await this.prisma.service.findMany({ where: { tenantId, locationId } });
    if (services.length > 0) {
      if (serviceName) {
        const match = services.find(s => s.name.toLowerCase().includes(serviceName.toLowerCase()));
        serviceId = match ? match.id : services[0].id;
      } else {
        serviceId = services[0].id;
      }
    }

    try {
      const scheduledStart = new Date(`${date}T${time}:00Z`);
      if (isNaN(scheduledStart.getTime())) return { success: false, message: 'Invalid date/time format.' };

      const scheduledEnd = new Date(scheduledStart.getTime() + 30 * 60000); // Default 30 min

      await this.appointmentService.create({
        tenantId,
        customerId: customer.id,
        locationId,
        serviceId: serviceId || '',
        scheduledStart,
        scheduledEnd,
        bookingSource: 'WHATSAPP',
      });
      return { success: true, message: 'Appointment booked successfully.' };
    } catch (e) {
      return { success: false, message: `Failed to book: ${e.message}` };
    }
  }
}
