import { currentAdvisor } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { LogoutButton } from '@/components/logout-button';
import { Avatar } from '@/components/ui/avatar';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Profil — Anna' };

const ROLE_LABELS: Record<string, string> = {
  advisor: 'Poradce',
  tenant_admin: 'Admin sítě',
  super_admin: 'Super admin',
};

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-body-sm text-tertiary">{label}</span>
      <span className="text-body text-primary">{value}</span>
    </div>
  );
}

export default async function ProfilPage() {
  const advisor = await currentAdvisor();

  let tenantName = '4FIN HOLDING';
  if (advisor) {
    const { data } = await supabaseAdmin()
      .from('advisors')
      .select('tenant:tenants(name)')
      .eq('id', advisor.id)
      .maybeSingle();
    const t = data?.tenant as { name: string } | { name: string }[] | null;
    if (t) tenantName = Array.isArray(t) ? t[0]?.name ?? tenantName : t.name;
  }

  const roleLabel = advisor ? ROLE_LABELS[advisor.role] ?? advisor.role : 'Poradce';

  return (
    <PageShell width="narrow">
      <PageHeader title="Profil" description="Tvé údaje a nastavení účtu." />

      <div className="flex items-center gap-4 py-6">
        <Avatar name={advisor?.full_name ?? 'Anna'} size="lg" />
        <div>
          <p className="text-h3 text-primary">{advisor?.full_name ?? '—'}</p>
          <p className="text-body-sm text-tertiary">{advisor?.email ?? '—'}</p>
        </div>
      </div>

      <div className="divide-y divide-border-subtle border-y border-border-subtle">
        <DetailRow label="Role" value={roleLabel} />
        <DetailRow label="Síť" value={tenantName} />
      </div>

      <div className="mt-10">
        <LogoutButton />
      </div>
    </PageShell>
  );
}
