import 'server-only';

// TODO: replace mocks with real session reading once F1.B + /login wired.
// Karel Novák — advisor id from supabase/seed.sql
export const MOCK_ADVISOR_ID = '00000000-0000-0000-0000-ad0000000001';
// 4FIN HOLDING — tenant id from supabase/seed.sql
export const MOCK_TENANT_ID = '00000000-0000-0000-0000-00000000f1f1';

export async function currentAdvisorId(): Promise<string> {
  return MOCK_ADVISOR_ID;
}

export async function currentTenantId(): Promise<string> {
  return MOCK_TENANT_ID;
}
