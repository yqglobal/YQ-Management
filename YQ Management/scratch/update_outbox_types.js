const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/tasks/outbox-processor.service.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `    const isVisitEvent = [
      'VISIT_CREATED',
      'VISIT_UPDATED',
      'VISIT_CALLED',
      'VISIT_COMPLETED',
      'VISIT_MISSED',
      'VISIT_CANCELLED',
      'VISIT_CHECKED_IN',
    ].includes(type);`;

const newStr = `    const isVisitEvent = [
      'VISIT_CREATED',
      'VISIT_UPDATED',
      'VISIT_CALLED',
      'VISIT_COMPLETED',
      'VISIT_MISSED',
      'VISIT_CANCELLED',
      'VISIT_CHECKED_IN',
      'VISIT_STEP_ACTIVATED',
      'VISIT_STEP_COMPLETED',
    ].includes(type);`;

content = content.replace(targetStr, newStr);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Updated outbox-processor.service.ts");
