const fs = require('fs');
const file = 'backend/src/whatsapp/whatsapp.service.ts';
let code = fs.readFileSync(file, 'utf8');

// Patch sendMediaMessage result error
const sendMediaResultRegex = /if \(result\.error\) \{\s*return \{ success: false, error: result\.error\.message \};\s*\}/g;
const sendMediaResultReplacement = `if (result.error) {
      let errorMsg = result.error.message;
      if (result.status === 408 || result.status === 502 || result.status === 503) {
        errorMsg = "WhatsApp phone appears to be offline or unreachable. Please ensure it has an active internet connection.";
      }
      return { success: false, error: errorMsg };
    }`;
code = code.replace(sendMediaResultRegex, sendMediaResultReplacement);

// Patch sendButtons result error
const sendButtonsResultRegex = /if \(result\.error\) \{\s*this\.logger\.error\(\s*`Failed to send WhatsApp buttons to \$\{normalizedNumber\} on \$\{instanceName\}: \$\{result\.error\.message\}`,\s*\);\s*return \{ success: false, error: result\.error\.message \};\s*\}/g;
const sendButtonsResultReplacement = `if (result.error) {
      let errorMsg = result.error.message;
      if (result.status === 408 || result.status === 502 || result.status === 503) {
        errorMsg = "WhatsApp phone appears to be offline or unreachable. Please ensure it has an active internet connection.";
      }
      this.logger.error(
        \`Failed to send WhatsApp buttons to \${normalizedNumber} on \${instanceName}: \${result.error.message}\`,
      );
      return { success: false, error: errorMsg };
    }`;
code = code.replace(sendButtonsResultRegex, sendButtonsResultReplacement);

fs.writeFileSync(file, code);
console.log('Patched whatsapp.service.ts further');
