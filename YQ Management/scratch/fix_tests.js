const fs = require('fs');
const path = require('path');

// Fix appointment test
const apptFile = path.join(__dirname, '../backend/src/appointment/__tests__/appointment.service.spec.ts');
let apptContent = fs.readFileSync(apptFile, 'utf-8');
apptContent = apptContent.replace(
  `import { GoogleService } from '../../google/google.service';`,
  `import { GoogleService } from '../../google/google.service';\nimport { QueueGateway } from '../../queue/queue.gateway';`
);
apptContent = apptContent.replace(
  `{ provide: GoogleService, useValue: {} },`,
  `{ provide: GoogleService, useValue: {} },\n        { provide: QueueGateway, useValue: {} },`
);
fs.writeFileSync(apptFile, apptContent, 'utf-8');

// Fix visit test
const visitFile = path.join(__dirname, '../backend/src/visit/__tests__/visit.service.spec.ts');
let visitContent = fs.readFileSync(visitFile, 'utf-8');
visitContent = visitContent.replace(
  `{ provide: VisitStepService, useValue: {} },`,
  `{ provide: VisitStepService, useValue: { activateFirstPendingStep: jest.fn() } },`
);
fs.writeFileSync(visitFile, visitContent, 'utf-8');
