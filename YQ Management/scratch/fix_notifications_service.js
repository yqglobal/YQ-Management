const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../backend/src/notifications/notifications.service.ts');
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  `import { Injectable, Logger, OnModuleInit } from '@nestjs/common';`,
  `import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';`
);

content = content.replace(
  `private readonly whatsappService: WhatsappService,`,
  `@Inject(forwardRef(() => WhatsappService)) private readonly whatsappService: WhatsappService,`
);

fs.writeFileSync(file, content, 'utf-8');
