interface Props {
  /** Hlavní číslo (už zformátované, např. "42 100 Kč"). */
  value: string;
  /** Nepovinný drobný popisek nad číslem (např. "Volný měsíční zůstatek"). */
  label?: React.ReactNode;
  /** Nepovinný caption pod číslem (např. "z příjmu 65 000 Kč po výdajích 22 900 Kč"). */
  caption?: React.ReactNode;
  /** Wine akcent místo defaultní inkoustové. */
  accent?: boolean;
}

export function HeroNumber({ value, label, caption, accent }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {label ? (
        <div className="flex items-center gap-1.5 text-body-sm text-tertiary">
          {label}
        </div>
      ) : null}
      <div
        className={`text-stat ${accent ? 'text-accent' : 'text-primary'} tabular-nums`}
      >
        {value}
      </div>
      {caption ? (
        <div className="text-body-sm text-secondary">{caption}</div>
      ) : null}
    </div>
  );
}
