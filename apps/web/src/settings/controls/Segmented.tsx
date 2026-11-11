import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  id: string;
  label: ReactNode;
  ariaLabel?: string;
  style?: React.CSSProperties;
  className?: string;
}

interface Props<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  grid?: boolean;
}

export function Segmented<T extends string>({ options, value, onChange, grid }: Props<T>) {
  return (
    <div
      className={
        grid ? 'grid grid-cols-2 gap-2' : 'flex rounded-lg border border-line bg-raised p-1'
      }
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            id={o.id}
            type="button"
            aria-pressed={active}
            aria-label={o.ariaLabel}
            title={o.ariaLabel}
            style={o.style}
            onClick={() => onChange(o.value)}
            className={`${grid ? 'rounded border px-3 py-2 text-xs' : 'flex-1 rounded py-1'} transition-colors ${
              active
                ? grid
                  ? 'border-accent bg-raised text-fg'
                  : 'bg-line text-fg'
                : grid
                  ? 'border-line bg-surface text-muted hover:bg-raised'
                  : 'text-muted hover:bg-raised'
            } ${o.className ?? ''}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
