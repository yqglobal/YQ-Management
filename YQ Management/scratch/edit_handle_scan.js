const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/visit-step/visit-step.service.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `    if (targetStep.type === 'CHECKPOINT' || targetStep.type === 'SERVICE') {
      return this.activateStep(tenantId, targetStep.id, staffId);
    }`;

const newStr = `    if (targetStep.type === 'CHECKPOINT' || targetStep.type === 'SERVICE') {
      if (targetStep.status === 'ACTIVE') {
        // Scanning an already active step completes it
        return this.advanceStep(tenantId, targetStep.id, staffId, {});
      }
      return this.activateStep(tenantId, targetStep.id, staffId);
    }`;

content = content.replace(targetStr, newStr);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("handleScan updated");
