import type { RangeKey } from '../../state/settings';
import { SETTINGS_RANGES } from '../../state/settings';

interface Props {
  id: string;
  rangeKey: RangeKey;
  label: string;
  value: number;
  readout: string;
  hint?: string;
  onChange: (value: number) => void;
}

export function Slider({ id, rangeKey, label, value, readout, hint, onChange }: Props) {
  const r = SETTINGS_RANGES[rangeKey];
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-sm">
        <label htmlFor={`${id}Input`} className="text-fg">
          {label}
        </label>
        <span id={`${id}Val`} className="font-mono text-accent">
          {readout}
        </span>
      </div>
      <input
        id={`${id}Input`}
        type="range"
        min={r.min}
        max={r.max}
        step={r.step}
        value={value}
        aria-valuetext={readout}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vp-range w-full"
      />
      {hint ? <p className="mt-1.5 text-[10px] leading-normal text-muted">{hint}</p> : null}
    </div>
  );
}
