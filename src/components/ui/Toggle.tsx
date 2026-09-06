import clsx from 'clsx'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}

export function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-[var(--oq-text-faint)]">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-[--color-indigo-oq]' : 'bg-[var(--oq-line)]',
        )}
      >
        <span
          className={clsx(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      className={clsx(
        'inline-flex rounded-lg border border-[var(--oq-line)] bg-[var(--oq-surface-2)] p-1',
        className,
      )}
      role="tablist"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
            value === option.value
              ? 'bg-[--color-indigo-oq] text-white'
              : 'text-[var(--oq-text-soft)] hover:text-[var(--oq-text)]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
