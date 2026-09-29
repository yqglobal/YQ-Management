const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../backend/src/visit/__tests__/visit.service.spec.ts');
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  `import { BlockOffService } from '../../block-off/block-off.service';`,
  `import { BlockOffService } from '../../block-off/block-off.service';\nimport { VisitStepService } from '../../visit-step/visit-step.service';`
);
content = content.replace(
  `{ provide: BlockOffService, useValue: {} },`,
  `{ provide: BlockOffService, useValue: {} },\n        { provide: VisitStepService, useValue: {} },`
);
fs.writeFileSync(file, content, 'utf-8');
