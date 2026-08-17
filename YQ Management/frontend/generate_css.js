const config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "primary": "#1571FF",
                        "on-background": "#1a1b22",
                        "primary-container": "#3b8bff",
                        "border": "#E4E4E7",
                        "outline-variant": "#bfc7d2",
                        "on-tertiary-fixed": "#2f1500",
                        "secondary-fixed-dim": "#68dba9",
                        "tertiary": "#8d4b00",
                        "secondary-fixed": "#85f8c4",
                        "secondary": "#006c4a",
                        "on-surface-variant": "#3f4850",
                        "card": "#FFFFFF",
                        "surface-variant": "#e3e1ec",
                        "inverse-primary": "#93ccff",
                        "on-surface": "#1a1b22",
                        "on-error-container": "#93000a",
                        "secondary-container": "#82f5c1",
                        "dark-canvas": "#09090B",
                        "tertiary-container": "#b15f00",
                        "outline": "#707881",
                        "surface-container": "#eeedf7",
                        "on-primary-container": "#fdfcff",
                        "surface-tint": "#1571FF",
                        "inverse-surface": "#2f3038",
                        "on-tertiary-container": "#fffbff",
                        "surface-bright": "#fbf8ff",
                        "background": "#fbf8ff",
                        "on-secondary-container": "#00714e",
                        "surface-container-lowest": "#ffffff",
                        "on-primary": "#ffffff",
                        "error": "#ba1a1a",
                        "primary-fixed-dim": "#93ccff",
                        "surface-container-highest": "#e3e1ec",
                        "surface-container-high": "#e8e7f1",
                        "primary-fixed": "#cce5ff",
                        "tertiary-fixed-dim": "#ffb77d",
                        "on-secondary": "#ffffff",
                        "surface-dim": "#dad9e3",
                        "on-secondary-fixed-variant": "#005137",
                        "surface": "#fbf8ff",
                        "on-tertiary": "#ffffff",
                        "canvas": "#FAFAFA",
                        "dark-card": "#121214",
                        "on-secondary-fixed": "#002114",
                        "alert": "#E11D48",
                        "error-container": "#ffdad6",
                        "on-tertiary-fixed-variant": "#6e3900",
                        "tertiary-fixed": "#ffdcc3",
                        "surface-container-low": "#f4f2fd",
                        "on-primary-fixed": "#001d31",
                        "dark-border": "#27272A",
                        "on-primary-fixed-variant": "#0a46b5",
                        "inverse-on-surface": "#f1effa",
                        "on-error": "#ffffff"
                    },
                    "spacing": {
                        "margin-desktop": "40px",
                        "margin-mobile": "16px",
                        "unit": "4px",
                        "header-h": "64px",
                        "gutter": "24px",
                        "sidebar-w": "256px"
                    },
                    "fontFamily": {
                        "body-sm": ["Plus Jakarta Sans"],
                        "headline-md": ["Plus Jakarta Sans"],
                        "body-lg": ["Plus Jakarta Sans"],
                        "data-mono": ["Geist Mono"],
                        "headline-sm": ["Plus Jakarta Sans"],
                        "headline-lg": ["Plus Jakarta Sans"],
                        "label-caps": ["Geist Mono"],
                        "body-md": ["Plus Jakarta Sans"],
                        "data-mono-lg": ["Geist Mono"]
                    }
                }
            }
};

let output = "";
for (const [key, value] of Object.entries(config.theme.extend.colors)) {
  output += `  --color-${key}: ${value};\n`;
}
for (const [key, value] of Object.entries(config.theme.extend.spacing)) {
  output += `  --spacing-${key}: ${value};\n`;
}
for (const [key, value] of Object.entries(config.theme.extend.fontFamily)) {
  let fonts = value.map(v => `"${v}"`).join(', ');
  if(fonts.includes('Geist Mono')) fonts += ", monospace";
  else fonts += ", sans-serif";
  output += `  --font-${key}: ${fonts};\n`;
}
console.log(output);
