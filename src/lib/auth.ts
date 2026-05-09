import 'server-only';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const DEMO_ADVISOR_UUID: Record<string, string> = {
  ad0000000001: '00000000-0000-0000-0000-ad0000000001',
  ad0000000002: '00000000-0000-0000-0000-ad0000000002',
  ad0000000003: '00000000-0000-0000-0000-ad0000000003',
  ad0000000004: '00000000-0000-0000-0000-ad0000000004',
  ad0000000005: '00000000-0000-0000-0000-ad0000000005',
  ad0000000099: '00000000-0000-0000-0000-ad0000000099',
};

export const MOCK_ADVISOR_ID = DEMO_ADVISOR_UUID.ad0000000001;
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
    /* outside request scope */
  }
  return MOCK_ADVISOR_ID;
}

export async function currentTenantId(): Promise<string> {
  return MOCK_TENANT_ID;
}

export interface CurrentAdvisor {
  id: string;
  full_name: string;
  email: string;
  role: 'advisor' | 'tenant_admin' | 'super_admin';
  avatar_url: string | null;
}

export async function currentAdvisor(): Promise<CurrentAdvisor | null> {
  const id = await currentAdvisorId();
  const { data, error } = await supabaseAdmin()
    .from('advisors')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as CurrentAdvisor;
}
