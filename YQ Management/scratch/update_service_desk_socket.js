const fs = require('fs');
const path = require('path');

const sdPath = path.join(__dirname, '../frontend/src/pages/dashboard/service-desk.tsx');
let sdContent = fs.readFileSync(sdPath, 'utf-8');

const targetStr = `    const events = [
      'VISIT_CREATED', 'VISIT_CALLED', 'VISIT_COMPLETED', 
      'VISIT_CHECKED_IN', 'VISIT_MISSED', 'VISIT_CANCELLED', 
      'APPOINTMENT_CREATED', 'queue_status_changed', 'QUEUE_EMERGENCY_PAUSED'
    ];`;

const newStr = `    const events = [
      'VISIT_CREATED', 'VISIT_CALLED', 'VISIT_COMPLETED', 
      'VISIT_CHECKED_IN', 'VISIT_MISSED', 'VISIT_CANCELLED', 
      'APPOINTMENT_CREATED', 'queue_status_changed', 'QUEUE_EMERGENCY_PAUSED',
      'visit_updated', 'visit_step_activated', 'visit_step_completed',
      'VISIT_UPDATED', 'visit_created', 'visit_called', 'visit_completed',
      'visit_checked_in', 'visit_missed', 'visit_cancelled'
    ];`;

sdContent = sdContent.replace(targetStr, newStr);

fs.writeFileSync(sdPath, sdContent, 'utf-8');
console.log("Updated service-desk.tsx events");
