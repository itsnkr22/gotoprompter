interface Props {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelId?: string;
  hidden?: boolean;
  rowId?: string;
}

export function Toggle({ id, label, hint, checked, onChange, labelId, hidden, rowId }: Props) {
  return (
    <div id={rowId} className={`${hidden ? 'hidden' : 'flex'} items-center justify-between gap-3`}>
      <div className="flex flex-col">
        <span id={labelId} className="text-sm text-fg">
          {label}
        </span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      <label className="vp-toggle relative inline-flex cursor-pointer items-center">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
        />
        <span className="vp-toggle-track h-6 w-11 rounded-full bg-raised transition-colors peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
          <span className="vp-toggle-thumb absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white transition-transform" />
        </span>
      </label>
    </div>
  );
}
