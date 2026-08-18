import { PrismaService } from '../prisma/prisma.service';

export class WhatsappChatbot {
  constructor(private prisma: PrismaService, private sendMsg: (jid: string, text: string) => Promise<void>) {}

  async process(tenantId: string, phone: string, jid: string, text: string) {
    let session = await this.prisma.chatSession.findUnique({
      where: { tenantId_phone: { tenantId, phone } }
    });

    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { tenantId, phone, step: 0 }
      });
    }

    // Reset if user says hi or menu
    if (['HI', 'HELLO', 'MENU', '0'].includes(text.toUpperCase())) {
      session = await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { step: 0, context: {} }
      });
    }

    if (session.step === 0) {
      await this.sendMsg(jid, "Welcome! Please choose an option:\n1. Book Appointment\n2. Check Status\n3. Cancel Appointment");
      await this.prisma.chatSession.update({ where: { id: session.id }, data: { step: 1 } });
      return;
    }

    if (session.step === 1) {
      if (text === '1') {
        const services = await this.prisma.service.findMany({ where: { tenantId } });
        if (services.length === 0) {
          await this.sendMsg(jid, "No services available right now. Reply 0 for menu.");
          await this.prisma.chatSession.update({ where: { id: session.id }, data: { step: 0 } });
          return;
        }
        let msg = "Select a service by number:\n";
        services.forEach((s, i) => { msg += `${i + 1}. ${s.name}\n`; });
        await this.sendMsg(jid, msg);
        await this.prisma.chatSession.update({ where: { id: session.id }, data: { step: 2, context: { services: services.map(s => s.id) } } });
      } else if (text === '2') {
        await this.sendMsg(jid, "You have no active appointments. Reply 0 for menu.");
        await this.prisma.chatSession.update({ where: { id: session.id }, data: { step: 0 } });
      } else if (text === '3') {
        await this.sendMsg(jid, "No appointments to cancel. Reply 0 for menu.");
        await this.prisma.chatSession.update({ where: { id: session.id }, data: { step: 0 } });
      } else {
        await this.sendMsg(jid, "Invalid option. Reply 0 for menu.");
      }
      return;
    }

    if (session.step === 2) {
      const idx = parseInt(text) - 1;
      const ctx = session.context as any;
      if (isNaN(idx) || !ctx.services[idx]) {
        await this.sendMsg(jid, "Invalid service selection. Reply 0 for menu.");
        return;
      }
      const serviceId = ctx.services[idx];
      await this.sendMsg(jid, "Please enter a date in YYYY-MM-DD format (e.g. 2026-08-20):");
      await this.prisma.chatSession.update({ where: { id: session.id }, data: { step: 3, context: { ...ctx, serviceId } } });
      return;
    }
    
    if (session.step === 3) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(text)) {
        await this.sendMsg(jid, "Invalid date format. Please use YYYY-MM-DD or 0 for menu.");
        return;
      }
      const ctx = session.context as any;
      
      // Normally we'd call getAvailableSlots here from QueueService or similar
      // For this implementation, we will just say "Your request for " + text + " is noted. (Integration pending). Reply 0 for menu."
      await this.sendMsg(jid, `Great! We will check slots for ${text}. To book, contact support. Reply 0 for menu.`);
      await this.prisma.chatSession.update({ where: { id: session.id }, data: { step: 0 } });
      return;
    }

    await this.sendMsg(jid, "I didn't understand that. Reply 0 for menu.");
  }
}
