import { PrismaClient, StepType, StepTrigger } from '@prisma/client';
import { INDUSTRY_TEMPLATES } from './industry-templates';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5455/yq_queue?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding BlueprintFlows...');

  for (const tpl of INDUSTRY_TEMPLATES) {
    let key = tpl.key;
    let name = tpl.name;
    let description = tpl.description;

    // Generalization logic
    if (key === 'school_event_catering') {
      key = 'catering_and_events';
      name = 'Catering & General Events';
      description = 'Event entry + catering entitlement system for concerts, graduations, parties, etc.';
    }

    const flow = await prisma.blueprintFlow.upsert({
      where: { key: key },
      update: {
        name,
        description,
        businessTypes: tpl.businessTypes,
      },
      create: {
        key: key,
        name,
        description,
        businessTypes: tpl.businessTypes,
      },
    });

    console.log(`Upserted BlueprintFlow: ${flow.name}`);

    // Delete existing steps to recreate them cleanly
    await prisma.blueprintStep.deleteMany({
      where: { blueprintId: flow.id },
    });

    for (const step of tpl.steps) {
      await prisma.blueprintStep.create({
        data: {
          blueprintId: flow.id,
          stepOrder: step.stepOrder,
          name: step.name,
          description: step.description,
          type: (step.type as StepType) || 'SERVICE',
          trigger: (step.trigger as StepTrigger) || 'MANUAL_STAFF',
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
        },
      });
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
