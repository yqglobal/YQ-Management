const fs = require('fs');
const filePath = 'backend/src/whatsapp/whatsapp.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'const activeToken = await this.prisma.token.findFirst({';
const endMarker = "return { handled: true, action: 'message' };\n      }";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const finalEndIndex = endIndex + endMarker.length;
  
  const replacement = `
      // Delegate to chatbot state machine
      const bot = new WhatsappChatbot(this.prisma, async (jidToSend, textToSend) => {
        await this.sendMessage(instanceName, jidToSend, textToSend);
      });
      await bot.process(tenant.id, phone, jid, text);
      return { handled: true, action: 'chatbot' };
  `;
  
  content = content.substring(0, startIndex) + replacement.trim() + '\n' + content.substring(finalEndIndex);
  fs.writeFileSync(filePath, content);
  console.log('Successfully replaced webhook logic.');
} else {
  console.error('Could not find markers', { startIndex, endIndex });
}
