import Link from 'next/link';
import { AnnaPromptInput } from './anna-prompt-input';

export function HeroBlock() {
  return (
    <section className="flex flex-col gap-8 pb-16 pt-20 md:pt-28">
      <div className="flex flex-col gap-4">
        <span className="text-caption text-tertiary">Co dnes potřebuješ</span>
        <h1 className="text-hero-sm text-primary md:text-hero">
          Anna ti pomůže.
        </h1>
        <p className="max-w-[52ch] text-body-lg text-secondary">
          Nahraj schůzku, vytvoř finanční plán nebo se zeptej na cokoliv. Anna umí
          shrnutí, návrhy a textování pro klienty.
        </p>
      </div>

      <div className="max-w-[640px]">
        <AnnaPromptInput />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-tertiary">
        <span>Rychlé akce</span>
        <Link href="/schuzky/nova" className="transition-colors hover:text-accent">
          Nahrát schůzku
        </Link>
        <Link href="/financni-plan/novy" className="transition-colors hover:text-accent">
          Nový finanční plán
        </Link>
        <Link href="/zakaznici" className="transition-colors hover:text-accent">
          Zákazníci
        </Link>
      </div>
    </section>
  );
}
