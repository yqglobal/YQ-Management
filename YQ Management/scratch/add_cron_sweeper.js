const fs = require('fs');
const path = require('path');

const cronPath = path.join(__dirname, '../backend/src/visit/visit.cron.ts');
let cronContent = fs.readFileSync(cronPath, 'utf-8');

const target = `  @Cron('0 23 * * *') // 23:00 UTC daily — safely past business hours for IST/AEST tenants
  async handleEndOfDaySweeps() {`;

const newCron = `  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredVisitSteps() {
    this.logger.log('Starting Sweep for Expired Visit Steps...');
    try {
      const now = new Date();
      const expiredSteps = await this.prisma.visitStep.findMany({
        where: {
          status: { in: ['PENDING', 'ACTIVE', 'DEFERRED'] },
          expiresAt: { lt: now },
        },
      });

      if (expiredSteps.length > 0) {
        this.logger.log(\`Found \${expiredSteps.length} expired steps to mark as EXPIRED.\`);

        await this.prisma.visitStep.updateMany({
          where: { id: { in: expiredSteps.map(s => s.id) } },
          data: { status: 'EXPIRED' },
        });

        // Create OutboxEvents so the UI updates live
        const events = expiredSteps.map(step => ({
          type: 'VISIT_UPDATED',
          payload: { visitId: step.visitId, tenantId: step.tenantId, queueId: step.queueId },
        }));
        
        await this.prisma.outboxEvent.createMany({
          data: events,
        });
      }
    } catch (err) {
      this.logger.error('Error during expired visit steps sweep:', err);
    }
  }

  @Cron('0 23 * * *') // 23:00 UTC daily — safely past business hours for IST/AEST tenants
  async handleEndOfDaySweeps() {`;

cronContent = cronContent.replace(target, newCron);
fs.writeFileSync(cronPath, cronContent, 'utf-8');
console.log("Added handleExpiredVisitSteps to visit.cron.ts");
