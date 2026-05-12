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
    <div>
      <ClientHeader customerName={customerName} plan={plan} />
      <CashflowSection cashflow={plan.cashflow} />
      <InsuranceSection
        insurance={plan.insurance}
        efa={plan.efa}
        efaInputs={plan.efaInputs}
      />
      <RetirementSection retirement={plan.retirement} />
      <div className="border-t border-border-subtle py-20 md:py-24">
        <NotesPanel sessionId={sessionId} initialNotes={notes} />
      </div>
    </div>
  );
}
