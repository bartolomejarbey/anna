import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finanční plán — Anna',
  description: 'Bezpečné nahrání podkladů pro tvého finančního poradce.',
  robots: { index: false, follow: false },
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <main>{children}</main>
    </div>
  );
}
