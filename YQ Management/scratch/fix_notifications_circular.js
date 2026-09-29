const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../backend/src/notifications/notifications.module.ts');
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  `import { Module } from '@nestjs/common';`,
  `import { Module, forwardRef } from '@nestjs/common';`
);

content = content.replace(
  `    WhatsappModule,`,
  `    forwardRef(() => WhatsappModule),`
);

fs.writeFileSync(file, content, 'utf-8');
