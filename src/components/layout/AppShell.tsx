import { useOutlet, useLocation } from 'react-router-dom'
import { useLayoutEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TopNav } from './TopNav'

/** Chromeless routes: study modes take over the whole viewport. */
const FULL_BLEED = /\/set\/[^/]+\/(flashcards|learn|write|spell|test|match|gravity)/

/**
 * Holds the outlet element captured at mount.
 *
 * AnimatePresence keeps the outgoing page mounted while it animates out, but
 * `useOutlet()` returns the *incoming* route as soon as the URL changes. Without
 * this freeze the new page renders inside the outgoing wrapper, then mounts a
 * second time when the key swaps — remounting discards any state the user set
 * during the transition, and the exiting page briefly shows the wrong content.
 */
function FrozenOutlet() {
  const [outlet] = useState(useOutlet())
  return outlet
}

export function AppShell() {
  const location = useLocation()
  const fullBleed = FULL_BLEED.test(location.pathname)

  // React Router keeps the scroll position across navigations, which lands you
  // halfway down a set page after creating it. Start each route at the top.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-full flex-col">
      {!fullBleed && <TopNav />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
          className="flex-1"
        >
          <FrozenOutlet />
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

export function Page({
  children,
  width = 'max-w-[1000px]',
  className = '',
}: {
  children?: React.ReactNode
  width?: string
  className?: string
}) {
  return <div className={`mx-auto w-full ${width} px-4 py-8 sm:px-6 ${className}`}>{children}</div>
}
