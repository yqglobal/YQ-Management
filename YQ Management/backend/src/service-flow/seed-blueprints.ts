import { PrismaClient, StepType, StepTrigger } from '@prisma/client';
import { INDUSTRY_TEMPLATES } from './industry-templates';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5455/yq_queue?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Seeding ${INDUSTRY_TEMPLATES.length} BlueprintFlows...`);

  for (const tpl of INDUSTRY_TEMPLATES) {
    const flow = await prisma.$transaction(async (tx) => {
      const f = await tx.blueprintFlow.upsert({
        where: { key: tpl.key },
        update: {
          name: tpl.name,
          description: tpl.description,
          businessTypes: tpl.businessTypes,
        },
        create: {
          key: tpl.key,
          name: tpl.name,
          description: tpl.description,
          businessTypes: tpl.businessTypes,
          tenantId: null, // Global — available to all tenants
        },
      });

      // Delete existing steps to recreate them cleanly
      await tx.blueprintStep.deleteMany({
        where: { blueprintId: f.id },
      });

      const hasPaymentAtCheckout = tpl.steps.some(s => s.type === 'PAYMENT' && s.stepOrder > tpl.steps.length / 2);
      const hasPaymentAtCheckin = tpl.steps.some(s => s.type === 'PAYMENT' && s.stepOrder <= tpl.steps.length / 2);
      const paymentTiming = hasPaymentAtCheckout ? 'CHECKOUT' : hasPaymentAtCheckin ? 'CHECKIN' : 'NONE';

      await tx.blueprintFlow.update({
        where: { id: f.id },
        data: { paymentTiming, checkinPayMode: paymentTiming === 'CHECKIN' ? 'ONLINE_OR_COUNTER' : null }
      });

      // Filter out PAYMENT
      let newSteps = tpl.steps.filter(s => s.type !== 'PAYMENT');
      
      newSteps.unshift({
        stepOrder: 0,
        name: 'Check-in (Booking)',
        description: 'Customer books online or at kiosk and gets a ticket.',
        type: 'CHECK_IN',
        trigger: 'AUTOMATIC',
        isSystem: true,
        category: 'bookend',
      } as any);

      newSteps.push({
        stepOrder: 99,
        name: 'Check-out (Completion)',
        description: 'Staff completes the visit at the counter.',
        type: 'CHECK_OUT',
        trigger: 'MANUAL_STAFF',
        isSystem: true,
        category: 'bookend',
      } as any);

      newSteps = newSteps.map((s, idx) => ({ ...s, stepOrder: idx }));

      await tx.blueprintStep.createMany({
        data: newSteps.map((step: any) => ({
          blueprintId: f.id,
          stepOrder: step.stepOrder,
          name: step.name,
          description: step.description,
          type: (step.type as StepType) || 'SERVICE',
          trigger: (step.trigger as StepTrigger) || 'MANUAL_STAFF',
          isSystem: step.isSystem || false,
          category: step.category || null,
          customerView: step.customerView || null,
          isOptional: step.isOptional || false,
          requiresQrScan: step.requiresQrScan ?? true,
          requiresStaffAction: step.requiresStaffAction ?? true,
          deferredByDays: step.deferredByDays,
          deferredByHours: step.deferredByHours,
          entitlementUnit: step.entitlementUnit,
          entitlementFixed: step.entitlementFixed,
          entitlementFormula: step.entitlementFormula,
          allowPartialRedemption: step.allowPartialRedemption || false,
          preventDoubleRedemption: step.preventDoubleRedemption ?? true,
          customerInstruction: step.customerInstruction,
          staffInstruction: step.staffInstruction,
          locationDescription: step.locationDescription,
          notifyCustomerOnActivation: step.notifyCustomerOnActivation ?? true,
          outcomeOptions: step.outcomeOptions || [],
          stepPrice: step.stepPrice,
          isPriceVariable: step.isPriceVariable || false,
        })),
      });

      return f;
    });

    console.log(
      `✓ Upserted: [${tpl.industry}] ${flow.name} (${tpl.steps.length} steps)`,
    );
  }

  console.log(
    `\n✅ Seeding complete. ${INDUSTRY_TEMPLATES.length} blueprints ready.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
