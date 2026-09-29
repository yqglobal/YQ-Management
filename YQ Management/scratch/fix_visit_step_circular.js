const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../backend/src/visit-step/visit-step.module.ts');
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  `import { Module } from '@nestjs/common';`,
  `import { Module, forwardRef } from '@nestjs/common';`
);

content = content.replace(
  `[PrismaModule, NotificationsModule]`,
  `[PrismaModule, forwardRef(() => NotificationsModule)]`
);

fs.writeFileSync(file, content, 'utf-8');
