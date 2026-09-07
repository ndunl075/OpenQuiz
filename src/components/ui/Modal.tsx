import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './Icon'
import { IconButton } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="oq-inset-pad fixed inset-x-0 top-0 z-50 flex h-[100dvh] items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            /*
             * Cap the dialog to the overlay's content box and scroll the body,
             * not the page: a tall dialog (the import preview, say) used to run
             * past the bottom of a phone screen and take its footer buttons
             * with it, leaving no way to confirm. `max-h-full` inherits the
             * overlay's safe-area padding, so the cap accounts for the notch
             * and the home indicator without repeating the arithmetic.
             */
            className={`relative flex max-h-full w-full ${width} flex-col oq-card oq-shadow-lg overflow-hidden`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {title && (
              <header className="flex shrink-0 items-center justify-between border-b border-[var(--oq-line)] px-6 py-4">
                <h2 className="text-lg font-bold">{title}</h2>
                <IconButton label="Close" onClick={onClose}>
                  <IconClose />
                </IconButton>
              </header>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-[var(--oq-line)] px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
