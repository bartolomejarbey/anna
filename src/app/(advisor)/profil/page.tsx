import { currentAdvisor } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LogoutButton } from '@/components/logout-button';

export const metadata = { title: 'Profil — Anna' };

const ROLE_LABELS: Record<string, string> = {
  advisor: 'Poradce',
  tenant_admin: 'Admin sítě',
  super_admin: 'Super admin',
};

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
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <h1 className="text-h1 text-primary mb-12">Profil</h1>

      <div className="max-w-md">
        <Card>
          <CardContent className="mt-0">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label>Jméno</Label>
                <p className="text-body text-primary">{advisor?.full_name ?? '—'}</p>
              </div>
              <div className="h-px bg-border-subtle" />
              <div className="flex flex-col gap-1.5">
                <Label>E-mail</Label>
                <p className="text-body text-primary">{advisor?.email ?? '—'}</p>
              </div>
              <div className="h-px bg-border-subtle" />
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <p className="text-body text-primary">{roleLabel}</p>
              </div>
              <div className="h-px bg-border-subtle" />
              <div className="flex flex-col gap-1.5">
                <Label>Síť</Label>
                <p className="text-body text-primary">{tenantName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
