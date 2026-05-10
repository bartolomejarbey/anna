import Link from 'next/link';
import { TypewriterPrompts } from './typewriter-prompts';
import { AnnaPromptInput } from './anna-prompt-input';

const HERO_PROMPTS = [
  'Analýza potřeb zákazníka...',
  'Příprava nabídky pro klienta...',
  'Shrnutí poslední schůzky...',
  'Psaní e-mailu zákazníkovi...',
  'Vytvoření newsletteru...',
] as const;

export function HeroBlock() {
  return (
    <section className="relative z-10 mx-auto flex min-h-[80vh] max-w-[1100px] flex-col justify-center py-32">
      <h1 className="mb-12 text-hero-serif text-primary">
        S čím ti dnes mohu pomoci?
      </h1>

      <div className="mb-10 h-[40px] font-sans text-[24px] leading-[1.4] text-secondary">
        <TypewriterPrompts prompts={HERO_PROMPTS} />
      </div>

      <AnnaPromptInput />

      <div className="mt-8 flex items-center gap-2 text-[14px] text-tertiary">
        <span>Rychlé akce:</span>
        <Link href="/schuzky/nova" className="transition-colors hover:text-accent">
          Nahrát schůzku
        </Link>
        <span aria-hidden>·</span>
        <Link href="/zakaznici" className="transition-colors hover:text-accent">
          Nový zákazník
        </Link>
        <span aria-hidden>·</span>
        <Link href="/nabidky" className="transition-colors hover:text-accent">
          Vytvořit nabídku
        </Link>
      </div>
    </section>
  );
}
