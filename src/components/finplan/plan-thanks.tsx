import { CheckCircle } from '@phosphor-icons/react/dist/ssr';

interface Props {
  customerName: string;
  advisorName: string;
}

export function PlanThanks({ customerName, advisorName }: Props) {
  const firstName = customerName ? customerName.split(' ')[0] : '';

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 pt-32 pb-24 md:px-8">
      <p className="anna-section-rule mb-5" aria-hidden />
      <CheckCircle size={32} weight="regular" className="mb-6 text-accent" />
      <h1 className="mb-6 text-h1 text-primary">
        {firstName ? `Díky, ${firstName}.` : 'Díky.'}
      </h1>
      <p className="text-prose text-secondary">
        Dokumenty jsme dostali. Teď je zpracujeme a tvůj poradce {advisorName} se ti během chvíle
        ozve s plánem.
      </p>
      <p className="mt-8 text-body-sm text-tertiary">
        Tuhle stránku můžeš zavřít.
      </p>
    </div>
  );
}
