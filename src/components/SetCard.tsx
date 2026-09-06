import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { pluralize, formatRelative } from '../lib/format'
import type { StudySet } from '../lib/types'
import { ProgressBar } from './ui/Progress'

interface SetCardProps {
  set: StudySet
  masteredPercent?: number
  folderName?: string
}

export function SetCard({ set, masteredPercent, folderName }: SetCardProps) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
      <Link
        to={`/set/${set.id}`}
        className="flex h-full flex-col rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] p-5 transition-shadow hover:oq-shadow-lg"
      >
        <span className="inline-flex w-fit rounded-full bg-[var(--oq-bg)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--oq-text-soft)]">
          {pluralize(set.terms.length, 'term')}
        </span>
        <h3 className="mt-3 line-clamp-2 text-[17px] font-bold leading-snug">{set.title}</h3>
        {set.description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--oq-text-soft)]">
            {set.description}
          </p>
        )}
        <div className="mt-auto pt-4">
          {masteredPercent !== undefined && masteredPercent > 0 && (
            <div className="mb-3">
              <ProgressBar value={masteredPercent} color="var(--color-mint)" />
              <span className="mt-1.5 block text-[11px] font-semibold text-[var(--oq-text-faint)]">
                {masteredPercent}% mastered
              </span>
            </div>
          )}
          <span className="text-[11px] font-medium text-[var(--oq-text-faint)]">
            {folderName ? `${folderName} · ` : ''}
            {formatRelative(set.updatedAt)}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

export function SetCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--oq-line)] px-6 py-16 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--oq-text-soft)]">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
