export function createBrandEmailLayout(options: {
  title: string;
  preheader?: string;
  headerTitle?: string;
  content: string;
  brandColor?: string;
  logoUrl?: string;
}): string {
  const {
    title,
    preheader,
    headerTitle = 'Qmova',
    content,
    brandColor = '#0ea5e9', // Primary brand color (sky-500)
  } = options;
  const frontendUrl = process.env.FRONTEND_URL || 'https://qmova.yqbuddy.com';
  const logoUrl = options.logoUrl || `${frontendUrl}/qmova-light-logo.png`;
  const year = new Date().getFullYear();

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${headerTitle}" style="max-height: 48px; margin: 0 auto; display: block;" />`
    : `<div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
         <span style="font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${headerTitle}</span>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  @media (prefers-color-scheme: dark) {
    body, .email-bg { background-color: #000000 !important; color: #f4f4f5 !important; }
    .email-container { background-color: #111111 !important; border: 1px solid #27272a !important; }
    .email-body { color: #e4e4e7 !important; }
    .footer-text { color: #71717a !important; }
    .divider { border-top-color: #27272a !important; color: #a1a1aa !important; }
  }
</style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #09090b; -webkit-font-smoothing: antialiased;">
  <!-- Preheader Text -->
  <div style="display: none; max-height: 0px; max-width: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #fff;">
    ${preheader || title}
  </div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" class="email-bg" style="background-color: #f4f4f5; padding: 60px 20px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.05); border: 1px solid #e4e4e7;">
          <!-- Brand Header -->
          <tr>
            <td style="background-color: ${brandColor}; padding: 40px 40px; text-align: center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    ${logoHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td class="email-body" style="padding: 48px 40px; text-align: left; line-height: 1.7; font-size: 17px; color: #3f3f46; font-weight: 400;">
              ${content}
              <div class="divider" style="margin-top: 56px; padding-top: 32px; border-top: 1px solid #e4e4e7; font-size: 15px; color: #71717a;">
                <p style="margin: 0; font-weight: 500;">Warm regards,</p>
                <p style="margin: 4px 0 0 0; font-weight: 700; color: ${brandColor};">The ${headerTitle} Team</p>
              </div>
            </td>
          </tr>
        </table>
        <!-- Footer Notification -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; margin-top: 32px;">
          <tr>
            <td class="footer-text" align="center" style="font-size: 13px; color: #a1a1aa; line-height: 1.6; padding: 0 20px;">
              <p style="margin: 0 0 12px 0;">This communication is intended exclusively for ${headerTitle} account holders.</p>
              <p style="margin: 0; font-weight: 500;">&copy; ${year} ${headerTitle}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateOtpBoxHtml(otp: string): string {
  return `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
  <tr>
    <td align="center">
      <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; display: inline-block; min-width: 280px; text-align: center;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 38px; font-weight: 800; color: #0f172a; letter-spacing: 12px; margin-left: 12px;">${otp}</span>
      </div>
    </td>
  </tr>
</table>`;
}

export function generateButtonHtml(
  text: string,
  url: string = '#',
  brandColor: string = '#0ea5e9',
): string {
  return `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 40px 0;">
  <tr>
    <td align="center">
      <a href="${url}" target="_blank" style="background-color: ${brandColor}; color: #ffffff; padding: 16px 40px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.15); transition: all 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">${text}</a>
    </td>
  </tr>
</table>`;
}
