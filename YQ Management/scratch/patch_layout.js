const fs = require('fs');

// Patch AdminLayout.tsx
const layoutFile = 'frontend/src/components/AdminLayout.tsx';
let layoutContent = fs.readFileSync(layoutFile, 'utf8');

// Replace the main tags
const oldMain = /<main className=\{`ml-0 md:ml-sidebar-w flex-1 flex flex-col overflow-hidden overscroll-none bg-canvas dark:bg-dark-canvas relative \$\{settingsMode \? 'mt-\[108px\]' : 'mt-header-h'\}`\}>\s*<div className=\{`flex-1 overflow-hidden overscroll-none w-full relative flex flex-col \$\{noPadding \? '' : 'p-margin-mobile md:p-margin-desktop overflow-auto'\}`\}>/g;

const newMain = `<main className={\`ml-0 md:ml-sidebar-w flex-1 flex flex-col overflow-hidden bg-canvas dark:bg-dark-canvas relative \${settingsMode ? 'pt-[108px]' : 'pt-header-h'}\`}>
        <div className={\`flex-1 overflow-y-auto overflow-x-hidden w-full relative flex flex-col \${noPadding ? '' : 'p-margin-mobile md:p-margin-desktop'}\`}>`;

layoutContent = layoutContent.replace(oldMain, newMain);

// Write back
fs.writeFileSync(layoutFile, layoutContent);
console.log('AdminLayout.tsx patched.');

// Patch globals.css
const cssFile = 'frontend/src/styles/globals.css';
let cssContent = fs.readFileSync(cssFile, 'utf8');

const scrollbarCSS = `
/* Custom Scrollbar Styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-outline-variant);
  border-radius: 10px;
}
.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-outline);
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
`;

if (!cssContent.includes('::-webkit-scrollbar')) {
  cssContent += '\n' + scrollbarCSS;
  fs.writeFileSync(cssFile, cssContent);
  console.log('globals.css patched with scrollbar styles.');
}
