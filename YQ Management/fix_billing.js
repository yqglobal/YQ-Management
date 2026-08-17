const fs = require('fs');
const path = 'frontend/src/pages/dashboard/settings/_components/billing.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace return ( {statusMessage...
content = content.replace(/return \(\s*\{\/\* Payment Confirmation Modal \*\/\}\s*\{statusMessage && \(/, 'return (\n    <>\n      {/* Payment Confirmation Modal */}\n      {statusMessage && (');

// And at the end, replace div
content = content.replace(/      \)\}\n    <\/div>\n    <\/>\n  \);\n\}/, '      )}\n    </div>\n    </>\n  );\n}');
content = content.replace(/      \)\}\n    <\/>\n  \);\n\}/, '      )}\n    </div>\n    </>\n  );\n}');

fs.writeFileSync(path, content);
console.log('Fixed');
