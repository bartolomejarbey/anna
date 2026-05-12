import {
  getCustomerSession,
  markSessionOpened,
  type CustomerSessionInfo,
} from '@/lib/actions/finplan-customer';
import { getFormResponse } from '@/lib/actions/finplan-customer-form';
import { CustomerFormWizard } from '@/components/finplan/customer-form-wizard';
import { PlanThanks } from '@/components/finplan/plan-thanks';
import { PlanError } from '@/components/finplan/plan-error';
import { PageShell } from '@/components/ui/page-shell';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PlanFormularPage({ params }: PageProps) {
  const { token } = await params;

  let session: CustomerSessionInfo;
  try {
    session = await getCustomerSession(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Něco se pokazilo.';
    return <PlanError message={msg} />;
  }

  void markSessionOpened(token).catch(() => {});

  if (
    session.status === 'uploaded' ||
    session.status === 'extracting' ||
    session.status === 'analyzed'
  ) {
    return <PlanThanks customerName={session.customerName} advisorName={session.advisorName} />;
  }

  const formState = await getFormResponse(token);

  return (
    <PageShell width="narrow">
      <div className="py-12">
        <CustomerFormWizard
          token={token}
          customerName={session.customerName}
          advisorName={session.advisorName}
          initialData={formState.data}
          initialStep={formState.currentStep}
          initialEmploymentType={session.employmentType ?? 'employee'}
          initialPrivacyMode={session.privacyMode}
        />
      </div>
    </PageShell>
  );
}
