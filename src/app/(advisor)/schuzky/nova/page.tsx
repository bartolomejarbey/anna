import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentAdvisorId } from '@/lib/auth';
import { NewMeetingShell } from './new-meeting-shell';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';

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
    <PageShell width="narrow">
      <PageHeader
        title="Nová schůzka"
        description="Vyber zákazníka, nahraj zvuk a Anna zbytek zvládne sama."
      />
      <NewMeetingShell customers={customers} />
    </PageShell>
  );
}
