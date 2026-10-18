import { Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'v8499S7TYaCt2MY/Q/jRGCAgVAJolBdO7/iZ/D18foc=';

export function getRoleToken(role: string = 'OWNER', email: string = 'abhimanyu.25bcs10330@sst.scaler.com') {
  return jwt.sign(
    {
      sub: '14886bec-ecfc-4ba9-87d5-d7d74a7e920b',
      email,
      role,
      tenantId: '36543677-acf4-4c04-bfc2-0e96881c2646',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function getAdminToken() {
  return getRoleToken('OWNER');
}

/**
 * Pre-authenticates the Playwright page session with a specific role,
 * injecting it into local storage and cookies, and bypassing modals/cookie consent.
 */
export async function loginAsRole(page: Page, role: string = 'OWNER') {
  const token = getRoleToken(role);

  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
    }
  ]);

  // Prime local storage with auth token and modal dismissals
  await page.addInitScript(({ token }) => {
    localStorage.setItem('qmover_auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('qmova_cookie_consent', JSON.stringify({ necessary: true, analytics: true, functional: true, marketing: true }));
    localStorage.setItem('qmova_policies_accepted_v1', 'true');
    localStorage.setItem('qmova_policies_accepted_14886bec-ecfc-4ba9-87d5-d7d74a7e920b', 'true');
    localStorage.setItem('qmova_plan_welcome_dismissed', 'true');
    localStorage.setItem('qmova_welcome_seen', 'true');
    localStorage.setItem('qmova_welcome_seen_v1', 'true');
    localStorage.setItem('hasSeenIntro', 'true');
    localStorage.setItem('yq_has_seen_tour', 'true');
    document.cookie = `token=${token}; path=/; SameSite=Lax`;

    const originalGet = localStorage.getItem.bind(localStorage);
    localStorage.getItem = (key: string) => {
      if (typeof key === 'string' && (key.startsWith('plan_welcomed_') || key.includes('welcome') || key.includes('hasSeen') || key.includes('Intro') || key.includes('tour') || key.includes('Tour'))) {
        return 'true';
      }
      return originalGet(key);
    };
  }, { token });
}

export async function loginAsAdmin(page: Page) {
  return loginAsRole(page, 'OWNER');
}

