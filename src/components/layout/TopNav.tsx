import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Button, IconButton } from '../ui/Button'
import { IconMoon, IconPlus, IconSearch, IconSettings, IconSun } from '../ui/Icon'
import { useSettings } from '../../store/useSettings'

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="OpenQuiz home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-oq text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4H14l6 6v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"
            fill="currentColor"
            opacity=".35"
          />
          <path d="M8 9h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[19px] font-bold tracking-tight">OpenQuiz</span>
    </Link>
  )
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/library', label: 'Your library', end: false },
  { to: '/stats', label: 'Stats', end: false },
]

export function TopNav() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { settings, update } = useSettings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isDark = document.documentElement.dataset.theme === 'dark'

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--oq-line)] bg-[var(--oq-surface)]">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'text-indigo-oq'
                    : 'text-[var(--oq-text-soft)] hover:bg-[var(--oq-surface-2)] hover:text-[var(--oq-text)]',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form
          className="relative ml-auto hidden min-w-0 flex-1 max-w-lg sm:block"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(`/library?q=${encodeURIComponent(query)}`)
          }}
        >
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--oq-text-faint)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your sets"
            aria-label="Search your sets"
            className="h-11 w-full rounded-full border border-transparent bg-[var(--oq-surface-2)] pl-11 pr-4 text-sm outline-none transition-colors focus:border-indigo-oq focus:bg-[var(--oq-surface)]"
            style={{ backgroundColor: 'var(--oq-bg)' }}
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <IconButton
            label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => update({ theme: isDark ? 'light' : 'dark' })}
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </IconButton>
          <IconButton label="Settings" onClick={() => navigate('/settings')}>
            <IconSettings />
          </IconButton>
          <Button
            size="sm"
            className="ml-1"
            icon={<IconPlus width={16} height={16} />}
            onClick={() => navigate('/create')}
          >
            <span className="hidden sm:inline">Create</span>
          </Button>
        </div>
      </div>
      {/* The desktop links live in the bar above; on small screens they move
          to a bottom tab row so Library and Stats stay reachable. */}
      <nav
        aria-label="Primary"
        className="flex border-t border-[var(--oq-line)] md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors',
                isActive
                  ? 'text-indigo-oq'
                  : 'text-[var(--oq-text-soft)] hover:text-[var(--oq-text)]',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <span className="sr-only">{settings.theme}</span>
    </header>
  )
}
