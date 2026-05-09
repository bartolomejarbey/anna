import 'server-only';
import { cookies } from 'next/headers';

// TODO: replace with real Supabase session reading once F1.B applies and
// real auth lands. Until then, /login sets a `mock_advisor` cookie pointing
// at one of the seed advisors; everything else reads it via currentAdvisorId().

export const DEMO_ADVISOR_UUID: Record<string, string> = {
  ad0000000001: '00000000-0000-0000-0000-ad0000000001',
  ad0000000002: '00000000-0000-0000-0000-ad0000000002',
  ad0000000003: '00000000-0000-0000-0000-ad0000000003',
  ad0000000004: '00000000-0000-0000-0000-ad0000000004',
  ad0000000005: '00000000-0000-0000-0000-ad0000000005',
};

// Karel Novák — fallback when no cookie is set.
export const MOCK_ADVISOR_ID = DEMO_ADVISOR_UUID.ad0000000001;
// 4FIN HOLDING — all five demo advisors share this tenant.
export const MOCK_TENANT_ID = '00000000-0000-0000-0000-00000000f1f1';

export const MOCK_ADVISOR_COOKIE = 'mock_advisor';

export async function currentAdvisorId(): Promise<string> {
  try {
    const store = await cookies();
    const shortId = store.get(MOCK_ADVISOR_COOKIE)?.value;
    if (shortId && DEMO_ADVISOR_UUID[shortId]) {
      return DEMO_ADVISOR_UUID[shortId];
    }
  } catch {
    // Outside request scope — fall through to default.
  }
  return MOCK_ADVISOR_ID;
}

export async function currentTenantId(): Promise<string> {
  return MOCK_TENANT_ID;
}
