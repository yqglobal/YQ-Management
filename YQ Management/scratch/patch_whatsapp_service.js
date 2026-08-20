const fs = require('fs');
const file = 'backend/src/whatsapp/whatsapp.service.ts';
let code = fs.readFileSync(file, 'utf8');

// Patch syncAllInstances to wake up 'close' instances
const syncCloseRegex = /this\.logger\.warn\(\s*`Instance \$\{instanceName\} is in 'close' state\. Will wait for user to manually reconnect if needed\.`,\s*\);/g;
const syncCloseReplacement = `this.logger.warn(
              \`Instance \${instanceName} is in 'close' state. Attempting to wake it up by calling /connect.\`,
            );
            await this.fetchEvo(\`/instance/connect/\${instanceName}\`, 'GET');`;
code = code.replace(syncCloseRegex, syncCloseReplacement);

// Patch sendMessage AUTO-REPAIR block to handle 408 / 502
const autoRepairRegex = /result\.status === 401 \|\|\s*result\.status === 404 \|\|\s*result\.status === 428 \|\|\s*result\.error\.message\.includes\('not connected'\)/g;
const autoRepairReplacement = `result.status === 401 ||
          result.status === 404 ||
          result.status === 428 ||
          result.status === 408 ||
          result.status === 502 ||
          result.status === 503 ||
          result.error.message.includes('not connected')`;
code = code.replace(autoRepairRegex, autoRepairReplacement);

// Also increase timeout in sendMessage to 25000ms
const sendTextRegex = /const result = await this\.fetchEvo\(\s*`\/message\/sendText\/\$\{instanceName\}`,\s*'POST',\s*\{\s*number: normalizedNumber,\s*text,\s*\},\s*\);/g;
const sendTextReplacement = `const result = await this.fetchEvo(
      \`/message/sendText/\${instanceName}\`,
      'POST',
      {
        number: normalizedNumber,
        options: { delay: 0, presence: "composing" },
        text,
      },
      25000,
    );`;
code = code.replace(sendTextRegex, sendTextReplacement);

// Fix error message returned from sendMessage
const resultErrorRegex = /return \{ success: false, error: result\.error\.message \};/g;
const resultErrorReplacement = `let errorMsg = result.error.message;
      if (result.status === 408 || result.status === 502 || result.status === 503) {
        errorMsg = "WhatsApp phone appears to be offline or unreachable. Please ensure it has an active internet connection.";
      }
      return { success: false, error: errorMsg };`;
code = code.replace(resultErrorRegex, resultErrorReplacement);

fs.writeFileSync(file, code);
console.log('Patched whatsapp.service.ts');
