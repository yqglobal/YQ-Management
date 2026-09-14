const { ValidationPipe } = require('@nestjs/common');
const pipe = new ValidationPipe({ whitelist: true });
const result = pipe.transform({ chatbotEnabled: true }, { type: 'body', metatype: Object });
console.log(result);
