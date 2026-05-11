import type { PlanData } from '@/lib/calculator/finplan/types';
import { ClientHeader } from './sections/client-header';
import { CashflowSection } from './sections/cashflow-section';
import { InsuranceSection } from './sections/insurance-section';
import { RetirementSection } from './sections/retirement-section';
import { NotesPanel } from './notes-panel';

interface Props {
  customerName: string;
  plan: PlanData;
  sessionId: string;
  notes: string;
}

export function PlanScreen({ customerName, plan, sessionId, notes }: Props) {
  return (
    <div className="flex flex-col gap-20">
      <ClientHeader customerName={customerName} plan={plan} />
      <CashflowSection cashflow={plan.cashflow} />
      <InsuranceSection insurance={plan.insurance} efa={plan.efa} />
      <RetirementSection retirement={plan.retirement} />
      <NotesPanel sessionId={sessionId} initialNotes={notes} />
    </div>
  );
}
