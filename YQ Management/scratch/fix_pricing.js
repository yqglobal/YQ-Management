const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/super-admin/pricing/index.tsx');
let content = fs.readFileSync(file, 'utf-8');

// replace editingPlan with (editingPlan as PlanData) inside setters
content = content.replace(/setEditingPlan\(\{\.\.\.editingPlan,/g, 'setEditingPlan({...editingPlan as PlanData,');
content = content.replace(/checked=\{editingPlan\.features/g, 'checked={editingPlan?.features');
content = content.replace(/value=\{editingPlan\.limits/g, 'value={editingPlan?.limits');
content = content.replace(/value=\{editingPlan\./g, 'value={editingPlan?.');
content = content.replace(/mutate\(editingPlan\)/g, 'mutate(editingPlan as PlanData)');

fs.writeFileSync(file, content, 'utf-8');
