import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finanční plán — Anna',
  description: 'Bezpečné nahrání podkladů pro tvého finančního poradce.',
  robots: { index: false, follow: false },
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-canvas">
      <div className="anna-mesh--page-tr" aria-hidden />
      <div className="anna-mesh--page-bl" aria-hidden />
      <div className="anna-paper-texture" aria-hidden />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
