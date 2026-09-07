import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import type { Grade } from '../../lib/grade'
import { Button } from '../ui/Button'

interface WrittenAnswerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  result?: { grade: Grade; expected: string }
  onOverride?: () => void
  onContinue?: () => void
  placeholder?: string
  autoFocusKey?: string
  hint?: string
}

const TONE: Record<Grade, { border: string; bg: string; label: string; text: string }> = {
  correct: {
    border: 'border-mint',
    bg: 'bg-mint-soft',
    label: 'Correct',
    text: 'text-[#12794a]',
  },
  typo: {
    border: 'border-lemon',
    bg: 'bg-[#fff6d9]',
    label: 'Almost — watch your spelling',
    text: 'text-[#8a6300]',
  },
  incorrect: {
    border: 'border-coral',
    bg: 'bg-coral-soft',
    label: 'Correct answer',
    text: 'text-[#a63a28]',
  },
}

export function WrittenAnswer({
  value,
  onChange,
  onSubmit,
  result,
  onOverride,
  onContinue,
  placeholder = 'Type the answer',
  autoFocusKey,
  hint,
}: WrittenAnswerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [autoFocusKey])

  const tone = result ? TONE[result.grade] : undefined

  return (
    <div>
      <div
        className={clsx(
          'rounded-xl border-2 px-5 py-4 transition-colors',
          tone ? `${tone.border} ${tone.bg}` : 'border-[var(--oq-line)] bg-[var(--oq-surface)]',
          result?.grade === 'incorrect' && 'animate-shake',
        )}
      >
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--oq-text-faint)]">
          Your answer
        </label>
        <input
          ref={inputRef}
          value={value}
          readOnly={Boolean(result)}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (result) onContinue?.()
            else onSubmit()
          }}
          placeholder={placeholder}
          aria-label="Your answer"
          className="mt-1 w-full bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-[var(--oq-text-faint)]"
        />
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
          role="status"
        >
          <p className={clsx('text-sm font-bold', tone?.text)}>{tone?.label}</p>
          {result.grade !== 'correct' && (
            <p className="mt-1 text-lg font-semibold">{result.expected}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {onContinue && (
              <Button onClick={onContinue}>
                Continue{' '}
                <span aria-hidden className="ml-1 opacity-60">
                  ↵
                </span>
              </Button>
            )}
            {result.grade !== 'correct' && onOverride && (
              <Button variant="ghost" size="sm" onClick={onOverride}>
                I was right
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {!result && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-xs text-[var(--oq-text-faint)]">{hint}</span>
          <Button onClick={onSubmit} disabled={!value.trim()}>
            Answer
          </Button>
        </div>
      )}
    </div>
  )
}
