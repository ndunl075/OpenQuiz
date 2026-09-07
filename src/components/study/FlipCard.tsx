import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

interface FlipCardProps {
  flipped: boolean
  onFlip: () => void
  front: ReactNode
  back: ReactNode
  topLeft?: ReactNode
  topRight?: ReactNode
  className?: string
  /** -1 came from the left, 1 from the right. Drives the slide-in. */
  direction?: number
}

const FACE =
  'absolute inset-0 flex flex-col items-center justify-center backface-hidden ' +
  'rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-12 oq-shadow'

/**
 * The flashcard. Rotation lives on an inner wrapper so the horizontal
 * slide between cards and the Y-axis flip never fight each other.
 */
export function FlipCard({
  flipped,
  onFlip,
  front,
  back,
  topLeft,
  topRight,
  className,
  direction = 1,
}: FlipCardProps) {
  return (
    <motion.div
      key="card"
      initial={{ opacity: 0, x: direction * 90 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -90 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      className={clsx('perspective-1000 w-full', className)}
    >
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Show term' : 'Show definition'}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onFlip()
        }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        whileHover={{ scale: 1.004 }}
        className="preserve-3d relative h-[clamp(320px,52svh,460px)] w-full cursor-pointer outline-none"
      >
        <div className={FACE}>
          <span className="absolute left-4 top-4 flex gap-1">{topLeft}</span>
          <span className="absolute right-4 top-4 flex gap-1">{topRight}</span>
          {front}
        </div>
        <div className={clsx(FACE, 'rotate-y-180')} style={{ transform: 'rotateY(180deg)' }}>
          {back}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function CardText({ children }: { children: ReactNode }) {
  const text = String(children ?? '')
  const size =
    text.length > 220
      ? 'text-lg sm:text-xl'
      : text.length > 90
        ? 'text-xl sm:text-2xl'
        : 'text-2xl sm:text-4xl'
  return (
    <p
      className={clsx(
        'max-h-full overflow-y-auto text-center font-semibold leading-snug no-scrollbar',
        size,
      )}
    >
      {children}
    </p>
  )
}
