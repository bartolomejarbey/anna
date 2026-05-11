import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { getFinplanAnalysis } from '@/lib/actions/finplan';
import { PlanScreen } from '@/components/finplan/plan-screen';
import type { PlanData } from '@/lib/calculator/finplan/types';

export const metadata = { title: 'Finanční plán — Anna' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FinplanDetailPage({ params }: Props) {
  const { id } = await params;
  const analysis = await getFinplanAnalysis(id).catch(() => null);

  if (!analysis) {
    notFound();
  }

  const planData = analysis.planData as PlanData;

  return (
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <Link
        href="/financni-plan"
        className="mb-8 inline-flex items-center gap-2 text-body-sm text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} weight="regular" />
        Plány
      </Link>

      <PlanScreen
        customerName={analysis.customerName}
        plan={planData}
        sessionId={analysis.sessionId}
        notes={analysis.notes ?? ''}
      />
    </div>
  );
}
