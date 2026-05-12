import { WarningCircle } from '@phosphor-icons/react/dist/ssr';

interface Props {
  message: string;
}

export function PlanError({ message }: Props) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 pt-32 pb-24 md:px-8">
      <WarningCircle size={32} weight="regular" className="mb-6 text-accent" />
      <h1 className="mb-6 text-h1 text-primary">Odkaz není platný.</h1>
      <p className="text-prose text-secondary">{message}</p>
      <p className="mt-8 text-body-sm text-tertiary">
        Pokud odkaz vypršel, požádej svého poradce o nový.
      </p>
    </div>
  );
}
