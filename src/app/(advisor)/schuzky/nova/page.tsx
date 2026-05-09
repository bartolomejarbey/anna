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
  let dbError = false;

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
    dbError = true;
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold text-text-primary">Nová schůzka</h1>
        <p className="mt-2 text-[15px] text-text-secondary">
          Vyberte zákazníka a nahrávejte schůzku — live nebo jako soubor. Anna ji automaticky přepíše a zpracuje.
        </p>
      </div>

      {dbError && (
        <div className="mb-8 rounded-xl border border-border-subtle bg-bg-tertiary px-6 py-4">
          <p className="text-[15px] text-text-secondary">
            Data se zobrazí po napojení na databázi.
          </p>
        </div>
      )}

      <NewMeetingShell customers={customers} />
    </div>
  );
}
