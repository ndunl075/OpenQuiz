import { motion } from 'motion/react'
import clsx from 'clsx'
import type { Term } from '../../lib/types'

export interface ChoiceState {
  pickedId?: string
  correctId?: string
}

interface ChoiceGridProps {
  choices: Term[]
  /** Which side of each choice to display. */
  side: 'term' | 'definition'
  state: ChoiceState
  disabled?: boolean
  onPick: (choice: Term) => void
}

export function ChoiceGrid({ choices, side, state, disabled, onPick }: ChoiceGridProps) {
  const answered = state.pickedId !== undefined

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice, i) => {
        const isCorrect = answered && choice.id === state.correctId
        const isWrongPick = answered && choice.id === state.pickedId && !isCorrect

        return (
          <motion.button
            key={choice.id}
            type="button"
            disabled={disabled || answered}
            onClick={() => onPick(choice)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.18 }}
            whileHover={answered ? undefined : { y: -2 }}
            whileTap={answered ? undefined : { scale: 0.99 }}
            className={clsx(
              'flex min-h-[76px] items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-colors',
              'bg-[var(--oq-surface)] disabled:cursor-default',
              isCorrect && 'border-[--color-mint] bg-[--color-mint-soft]',
              isWrongPick && 'animate-shake border-[--color-coral] bg-[--color-coral-soft]',
              !isCorrect && !isWrongPick && 'border-[var(--oq-line)] hover:border-[--color-indigo-oq]',
              answered && !isCorrect && !isWrongPick && 'opacity-55',
            )}
          >
            <span
              className={clsx(
                'grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold',
                isCorrect
                  ? 'bg-[--color-mint] text-white'
                  : isWrongPick
                    ? 'bg-[--color-coral] text-white'
                    : 'bg-[var(--oq-bg)] text-[var(--oq-text-faint)]',
              )}
            >
              {i + 1}
            </span>
            <span className="text-sm font-medium leading-snug">
              {side === 'term' ? choice.term : choice.definition}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
