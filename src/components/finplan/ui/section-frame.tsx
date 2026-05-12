import type { ComponentType } from 'react';

interface IconProps {
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
}

interface Props {
  kicker: string;
  icon?: ComponentType<IconProps>;
  children: React.ReactNode;
  /** První sekce nemá horní rámeček. */
  first?: boolean;
}

export function SectionFrame({ kicker, icon: Icon, children, first }: Props) {
  return (
    <section
      className={`py-20 md:py-24${first ? '' : ' border-t border-border-subtle'}`}
    >
      <div className="mb-10 flex items-center gap-2 text-caption text-tertiary">
        {Icon ? <Icon size={14} weight="regular" /> : null}
        <span>{kicker}</span>
      </div>
      {children}
    </section>
  );
}
