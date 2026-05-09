'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEMO_ADVISOR_UUID, MOCK_ADVISOR_COOKIE } from '@/lib/auth';

export async function loginAsDemoAdvisor(advisorShortId: string): Promise<void> {
  if (!DEMO_ADVISOR_UUID[advisorShortId]) {
    throw new Error('Neznámý poradce.');
  }
  const store = await cookies();
  store.set({
    name: MOCK_ADVISOR_COOKIE,
    value: advisorShortId,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect('/dashboard');
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(MOCK_ADVISOR_COOKIE);
  redirect('/login');
}
