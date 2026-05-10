import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentAdvisorId } from '@/lib/auth';
import { NewMeetingShell } from './new-meeting-shell';

export const metadata = {
  title: 'Nová schůzka — Anna',
};

interface CustomerOption {
  id: string;
  full_name: string;
}

export default async function NovaSchuzkaPage() {
  let customers: CustomerOption[] = [];

  try {
    const advisorId = await currentAdvisorId();
    const { data, error } = await supabaseAdmin()
      .from('customers')
      .select('id, full_name')
      .eq('advisor_id', advisorId)
      .order('full_name');

    if (error) throw error;
    customers = (data ?? []) as CustomerOption[];
  } catch {
    customers = [];
  }

  return (
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <h1 className="text-h1 text-primary mb-16">Nová schůzka</h1>
      <NewMeetingShell customers={customers} />
    </div>
  );
}
