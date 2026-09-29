const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../backend/src/service-flow/dto/create-step.dto.ts');
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(/import {/, 'import { Min, ');
fs.writeFileSync(file, content, 'utf-8');
