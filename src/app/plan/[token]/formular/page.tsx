import {
  getCustomerSession,
  markSessionOpened,
  type CustomerSessionInfo,
} from '@/lib/actions/finplan-customer';
import { getFormResponse } from '@/lib/actions/finplan-customer-form';
import { CustomerFormWizard } from '@/components/finplan/customer-form-wizard';
import { PlanThanks } from '@/components/finplan/plan-thanks';
import { PlanError } from '@/components/finplan/plan-error';

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

  // Fire-and-forget
  void markSessionOpened(token).catch(() => {});

  // Pokud už je submitted, ukázat díky
  if (
    session.status === 'uploaded' ||
    session.status === 'extracting' ||
    session.status === 'analyzed'
  ) {
    return <PlanThanks customerName={session.customerName} advisorName={session.advisorName} />;
  }

  const formState = await getFormResponse(token);

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-20 pb-24 md:px-8">
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
  );
}
