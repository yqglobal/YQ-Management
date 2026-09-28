import { PrismaClient } from '@prisma/client';

/**
 * Calculates an advanced Estimated Wait Time (EWT) based on load balancing principles,
 * real-time tempo, and currently active capacity.
 */
export async function calculateAdvancedEWT(
  prisma: any,
  queueId: string | null | undefined,
  serviceId: string | null | undefined,
  waitingAhead: number,
  fallbackDuration: number = 5
): Promise<number> {
  if (waitingAhead === 0 || !queueId) return 0;

  // 1. Determine active capacity (how many people are currently being served)
  const activeVisits = await prisma.visit.findMany({
    where: { queueId, currentState: 'IN_SERVICE' },
    select: { serviceStart: true, service: { select: { expectedDuration: true } } }
  });
  const capacity = Math.max(1, activeVisits.length);

  // 2. Base duration from recent tempo (rolling average of last 15 completed visits today)
  let avgServiceTime = fallbackDuration;
  if (serviceId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recentVisits = await prisma.visit.findMany({
      where: { 
        serviceId, 
        currentState: 'COMPLETED',
        serviceStart: { not: null },
        completedAt: { not: null, gte: today }
      },
      orderBy: { completedAt: 'desc' },
      take: 15,
      select: { serviceStart: true, completedAt: true }
    });
    
    if (recentVisits.length > 0) {
      const totalServiceTime = recentVisits.reduce((acc: number, v: any) => {
        if (v.completedAt && v.serviceStart) {
           return acc + (v.completedAt.getTime() - v.serviceStart.getTime()) / 60000;
        }
        return acc;
      }, 0);
      avgServiceTime = totalServiceTime / recentVisits.length;
    }
  }

  // 3. Raw EWT based on load balancing
  let rawEWT = (waitingAhead * avgServiceTime) / capacity;

  // 4. Adjust for currently serving visits (if they are about to finish, EWT should drop)
  if (activeVisits.length > 0) {
    const now = new Date().getTime();
    const avgElapsed = activeVisits.reduce((acc: number, v: any) => {
      if (v.serviceStart) {
        const elapsed = (now - v.serviceStart.getTime()) / 60000;
        // Cap elapsed time to 1.5x expected duration so stalled visits don't drop EWT below 0
        const maxExpected = (v.service?.expectedDuration || fallbackDuration) * 1.5;
        return acc + Math.min(elapsed, maxExpected);
      }
      return acc;
    }, 0) / activeVisits.length;

    // We subtract the average time already spent on current customers, divided by capacity
    const timeCredit = avgElapsed / capacity;
    rawEWT -= timeCredit;
  }

  return Math.max(1, Math.round(rawEWT));
}
