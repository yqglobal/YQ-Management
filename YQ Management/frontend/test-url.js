const subdomain = 'narayana';
let baseDomain = 'https://qmova.yqbuddy.com'; // Wait, let's say NEXT_PUBLIC_APP_URL is https://qmova.yqbuddy.com
try {
  const url = new URL(baseDomain);
  if (!url.hostname.startsWith(`${subdomain}.`)) {
    url.hostname = `${subdomain}.${url.hostname}`;
  }
  console.log("If NEXT_PUBLIC_APP_URL is qmova:", url.toString());
} catch(e) {}

baseDomain = 'https://narayana.qmova.yqbuddy.com'; // If NEXT_PUBLIC_APP_URL is NOT set
try {
  const url = new URL(baseDomain);
  if (!url.hostname.startsWith(`${subdomain}.`)) {
    url.hostname = `${subdomain}.${url.hostname}`;
  }
  console.log("If NEXT_PUBLIC_APP_URL is NOT set (on tenant page):", url.toString());
} catch(e) {}

