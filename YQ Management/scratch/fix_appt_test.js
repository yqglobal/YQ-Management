const fs = require('fs');
const path = require('path');

const apptFile = path.join(__dirname, '../backend/src/appointment/__tests__/appointment.service.spec.ts');
let apptContent = fs.readFileSync(apptFile, 'utf-8');

apptContent = apptContent.replace(
  `{ provide: QueueGateway, useValue: { server: { to: jest.fn().mockReturnThis(), emit: jest.fn() } } },`,
  `{ provide: QueueGateway, useValue: { broadcastTenantUpdate: jest.fn(), server: { to: jest.fn().mockReturnThis(), emit: jest.fn() } } },`
);

fs.writeFileSync(apptFile, apptContent, 'utf-8');
