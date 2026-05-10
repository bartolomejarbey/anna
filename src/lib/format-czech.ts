const PR = new Intl.PluralRules('cs');

interface CsForms {
  one: string;
  few: string;
  other: string;
}

export function pluralCs(n: number, forms: CsForms): string {
  const cat = PR.select(n);
  if (cat === 'one') return forms.one;
  if (cat === 'few') return forms.few;
  return forms.other;
}

export type RelativeDate =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'days-ago'; n: number }
  | { kind: 'weeks-ago'; n: number }
  | { kind: 'date'; day: number; month: string };

export function relativeDateCs(input: Date | string): RelativeDate {
  const d = typeof input === 'string' ? new Date(input) : input;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today.getTime() - target.getTime()) / 86_400_000);

  if (diff < 0) {
    return {
      kind: 'date',
      day: d.getDate(),
      month: d.toLocaleDateString('cs-CZ', { month: 'long' }),
    };
  }
  if (diff === 0) return { kind: 'today' };
  if (diff === 1) return { kind: 'yesterday' };
  if (diff >= 2 && diff <= 6) return { kind: 'days-ago', n: diff };
  if (diff >= 7 && diff <= 13) return { kind: 'weeks-ago', n: 1 };
  if (diff >= 14 && diff <= 20) return { kind: 'weeks-ago', n: 2 };
  if (diff >= 21 && diff <= 27) return { kind: 'weeks-ago', n: 3 };
  return {
    kind: 'date',
    day: d.getDate(),
    month: d.toLocaleDateString('cs-CZ', { month: 'long' }),
  };
}
