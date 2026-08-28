const fs = require('fs');
const file = '/home/abhimanyu/Projects/YQ/YQ Management/backend/src/visit/visit.service.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add RedisService import
if (!code.includes("import { RedisService }")) {
  code = code.replace(
    "import { WhatsappService } from '../whatsapp/whatsapp.service';",
    "import { WhatsappService } from '../whatsapp/whatsapp.service';\nimport { RedisService } from '../redis/redis.service';"
  );
}

// 2. Inject RedisService in constructor
if (!code.includes("private readonly redisService: RedisService")) {
  code = code.replace(
    "private readonly appointmentService: AppointmentService,",
    "private readonly appointmentService: AppointmentService,\n    private readonly redisService: RedisService,"
  );
}

// 3. Update joinMultiple signature to accept otp?: string
const joinMultipleSignatureRegex = /async joinMultiple\(data: {\n    customerName: string;\n    phone\?: string \| null;\n    language\?: string;\n    bookings:/;
if (joinMultipleSignatureRegex.test(code)) {
  code = code.replace(
    joinMultipleSignatureRegex,
    `async joinMultiple(data: {
    customerName: string;
    phone?: string | null;
    otp?: string;
    language?: string;
    bookings:`
  );
}

// 4. Update the logic inside the transaction to verify OTP
const transactionStartRegex = /const tenantId = firstService\.tenantId;\n      const locationId = firstService\.locationId;/;
const otpLogic = `const tenantId = firstService.tenantId;
      const locationId = firstService.locationId;

      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.whatsappConnected && data.phone) {
        if (!data.otp) {
          throw new BadRequestException('OTP is required');
        }
        const redisKey = \`otp:booking:\${data.phone}\`;
        const storedOtp = await this.redisService.client.get(redisKey);
        if (storedOtp !== data.otp) {
          throw new BadRequestException('Invalid or expired OTP');
        }
        await this.redisService.client.del(redisKey);
      }
`;
if (transactionStartRegex.test(code)) {
  code = code.replace(transactionStartRegex, otpLogic);
}

fs.writeFileSync(file, code);
console.log('visit.service.ts updated');
