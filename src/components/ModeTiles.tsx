import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import {
  IconBrain,
  IconCards,
  IconGravity,
  IconMatch,
  IconPencil,
  IconSpell,
  IconTest,
} from './ui/Icon'
import type { StudyMode } from '../lib/types'

export interface ModeMeta {
  mode: StudyMode
  label: string
  blurb: string
  icon: ReactNode
  accent: string
}

export const MODES: ModeMeta[] = [
  {
    mode: 'flashcards',
    label: 'Flashcards',
    blurb: 'Flip through at your own pace',
    icon: <IconCards />,
    accent: '#4255ff',
  },
  {
    mode: 'learn',
    label: 'Learn',
    blurb: 'Adaptive rounds until it sticks',
    icon: <IconBrain />,
    accent: '#7c5cff',
  },
  {
    mode: 'write',
    label: 'Write',
    blurb: 'Type every answer from memory',
    icon: <IconPencil />,
    accent: '#0f9bd7',
  },
  {
    mode: 'spell',
    label: 'Spell',
    blurb: 'Listen and type what you hear',
    icon: <IconSpell />,
    accent: '#21bf73',
  },
  {
    mode: 'test',
    label: 'Test',
    blurb: 'A graded practice exam',
    icon: <IconTest />,
    accent: '#e0a800',
  },
  {
    mode: 'match',
    label: 'Match',
    blurb: 'Pair them up against the clock',
    icon: <IconMatch />,
    accent: '#ff725b',
  },
  {
    mode: 'gravity',
    label: 'Gravity',
    blurb: 'Answer before it hits the ground',
    icon: <IconGravity />,
    accent: '#c2418f',
  },
]

export function ModeTiles({ setId }: { setId: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {MODES.map((meta, i) => (
        <motion.div
          key={meta.mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.035, duration: 0.22 }}
        >
          <Link
            to={`/set/${setId}/${meta.mode}`}
            className="group flex h-full flex-col gap-1 rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] p-4 transition-all hover:-translate-y-0.5 hover:oq-shadow-lg"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-lg text-white transition-transform group-hover:scale-110"
              style={{ background: meta.accent }}
            >
              {meta.icon}
            </span>
            <span className="mt-2 font-bold">{meta.label}</span>
            <span className="text-[12px] leading-snug text-[var(--oq-text-faint)]">
              {meta.blurb}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
