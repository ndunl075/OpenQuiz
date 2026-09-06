import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { TopNav } from './TopNav'

/** Chromeless routes: study modes take over the whole viewport. */
const FULL_BLEED = /\/set\/[^/]+\/(flashcards|learn|write|spell|test|match|gravity)/

export function AppShell() {
  const location = useLocation()
  const fullBleed = FULL_BLEED.test(location.pathname)

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
          <Outlet />
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
  children: React.ReactNode
  width?: string
  className?: string
}) {
  return <div className={`mx-auto w-full ${width} px-4 py-8 sm:px-6 ${className}`}>{children}</div>
}
