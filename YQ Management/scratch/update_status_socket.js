const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/_tenant/[subdomain]/status/[tokenId].tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `    socket.on('queue_status_changed', refresh);
    socket.on('token_joined', refresh);
    socket.on('token_serving', refresh);
    socket.on('token_completed', refresh);
    socket.on('token_missed', refresh);`;

const newStr = `    socket.on('queue_status_changed', refresh);
    socket.on('token_joined', refresh);
    socket.on('token_serving', refresh);
    socket.on('token_completed', refresh);
    socket.on('token_missed', refresh);
    socket.on('visit_updated', refresh);
    socket.on('visit_called', refresh);
    socket.on('visit_completed', refresh);
    socket.on('visit_missed', refresh);
    socket.on('visit_step_activated', refresh);
    socket.on('visit_step_completed', refresh);`;

content = content.replace(targetStr, newStr);

// Also join the visit room to receive visit-specific events!
const joinQueueTarget = `socket.emit('joinQueueRoom', queueId);`;
const joinQueueNew = `socket.emit('joinQueueRoom', queueId);
      socket.emit('joinVisitRoom', token.id);`;

content = content.replace(joinQueueTarget, joinQueueNew);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Updated status.tsx sockets");
