const fs = require('fs');
const path = require('path');

const vsPath = path.join(__dirname, '../backend/src/visit-step/visit-step.service.ts');
let vsContent = fs.readFileSync(vsPath, 'utf-8');

// We need to add expiresAt calculation for both stepsToCreate mappings
// 1. in instantiateStepsForVisit
const target1 = `        queueId: template.queueId,
        quantityAllocated: allocated,
      };
    });`;

const replacement1 = `        queueId: template.queueId,
        quantityAllocated: allocated,
        expiresAt: template.expiresAfterDays 
          ? new Date(Date.now() + template.expiresAfterDays * 24 * 60 * 60 * 1000)
          : template.expiresAfterHours 
            ? new Date(Date.now() + template.expiresAfterHours * 60 * 60 * 1000)
            : null,
      };
    });`;

vsContent = vsContent.replace(target1, replacement1);

// 2. in evaluateNextSteps
const target2 = `        queueId: template.queueId,
        quantityAllocated: template.entitlementFixed,
      }));`;

const replacement2 = `        queueId: template.queueId,
        quantityAllocated: template.entitlementFixed,
        expiresAt: template.expiresAfterDays 
          ? new Date(Date.now() + template.expiresAfterDays * 24 * 60 * 60 * 1000)
          : template.expiresAfterHours 
            ? new Date(Date.now() + template.expiresAfterHours * 60 * 60 * 1000)
            : null,
      }));`;

vsContent = vsContent.replace(target2, replacement2);

fs.writeFileSync(vsPath, vsContent, 'utf-8');
console.log("Updated expiresAt mappings");
