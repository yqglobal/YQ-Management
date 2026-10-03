const fs = require('fs');
const glob = require('glob'); // Not available? Let's just use raw node
const { execSync } = require('child_process');

const files = execSync("grep -rl 'qmova.yqbuddy.com' src/").toString().trim().split('\n');

for (const file of files) {
    if (!file) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace in backticks
    content = content.replace(/`https:\/\/qmova\.yqbuddy\.com(.*?)\`/g, '`${process.env.FRONTEND_URL || "https://qmova.yqbuddy.com"}$1`');
    
    // Replace in strings passed to functions
    content = content.replace(/'https:\/\/qmova\.yqbuddy\.com(.*?)'/g, '`${process.env.FRONTEND_URL || "https://qmova.yqbuddy.com"}$1`');
    
    // Replace '.qmova.yqbuddy.com'
    content = content.replace(/'.qmova.yqbuddy.com'/g, '(process.env.FRONTEND_DOMAIN || ".qmova.yqbuddy.com")');
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
}
