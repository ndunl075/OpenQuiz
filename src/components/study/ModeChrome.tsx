import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconButton } from '../ui/Button'
import { IconClose, IconFullscreen, IconSettings } from '../ui/Icon'
import { ProgressBar } from '../ui/Progress'

interface ModeChromeProps {
  setId: string
  title: string
  subtitle?: string
  progress?: { value: number; max: number }
  actions?: ReactNode
  onSettings?: () => void
  children: ReactNode
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen?.()
}

/** The chromeless full-viewport frame every study mode runs inside. */
export function ModeChrome({
  setId,
  title,
  subtitle,
  progress,
  actions,
  onSettings,
  children,
}: ModeChromeProps) {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--oq-bg)]">
      <header className="sticky top-0 z-20 bg-[var(--oq-bg)]/90 backdrop-blur pt-safe px-safe">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{title}</p>
            {subtitle && (
              <p className="truncate text-xs text-[var(--oq-text-faint)]">{subtitle}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {actions}
            {onSettings && (
              <IconButton label="Options" onClick={onSettings}>
                <IconSettings />
              </IconButton>
            )}
            <IconButton
              label="Toggle fullscreen"
              onClick={toggleFullscreen}
              className="hidden sm:inline-flex"
            >
              <IconFullscreen />
            </IconButton>
            <IconButton label="Exit study mode" onClick={() => navigate(`/set/${setId}`)}>
              <IconClose />
            </IconButton>
          </div>
        </div>
        {progress && (
          <ProgressBar
            value={progress.value}
            max={progress.max}
            height="h-1"
            className="rounded-none"
          />
        )}
      </header>
      <div className="flex flex-1 flex-col overflow-x-hidden px-safe pb-safe">{children}</div>
    </div>
  )
}

export function ModeLoading() {
  return <div className="min-h-dvh bg-[var(--oq-bg)]" />
}

export function NotEnoughTerms({ setId, need }: { setId: string; need: number }) {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--oq-bg)] px-6 text-center">
      <div>
        <p className="text-xl font-bold">This mode needs at least {need} terms</p>
        <p className="mt-2 text-sm text-[var(--oq-text-soft)]">
          Add a few more cards to this set and come back.
        </p>
        <button
          onClick={() => navigate(`/set/${setId}/edit`)}
          className="mt-6 rounded-lg bg-indigo-oq px-5 py-2.5 text-sm font-semibold text-white"
        >
          Edit set
        </button>
      </div>
    </div>
  )
}
