import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { MODES } from '../components/ModeTiles'
import { ButtonLink, buttonClass } from '../components/ui/Button'
import { IconArrowRight, IconCheck } from '../components/ui/Icon'

const REPO_URL = 'https://github.com/ndunl075/OpenQuiz'
const EASE = [0.2, 0.8, 0.2, 1] as const

/** The page is always light, so indigo has the contrast it needs throughout. */
const ACCENT_TEXT = 'text-indigo-oq'

/** Shared page gutter. oq-gutter widens to clear the notch in landscape. */
const WRAP = 'oq-gutter mx-auto w-full max-w-[1100px]'

/* ------------------------------------------------------------------ *
 * Motion helpers
 * ------------------------------------------------------------------ */

/** Fade-and-rise once, the first time the block scrolls into view. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -48px 0px' }}
      transition={{ duration: 0.32, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

function SectionHeading({
  id,
  eyebrow,
  title,
  body,
}: {
  id: string
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <Reveal className="max-w-2xl">
      <p className={clsx('text-xs font-bold uppercase tracking-wider', ACCENT_TEXT)}>{eyebrow}</p>
      <h2 id={id} className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
      {body && (
        <p className="mt-3 text-base text-[var(--oq-text-soft)] sm:text-lg">{body}</p>
      )}
    </Reveal>
  )
}

/* ------------------------------------------------------------------ *
 * Header
 * ------------------------------------------------------------------ */

function Wordmark() {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span
        className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-oq text-white"
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4H14l6 6v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"
            fill="currentColor"
            opacity=".35"
          />
          <path
            d="M8 9h6M8 13h8M8 17h5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-[19px] font-bold tracking-tight">OpenQuiz</span>
    </span>
  )
}

function Header() {
  return (
    <header className={clsx(WRAP, 'pt-safe flex h-16 items-center justify-between')}>
      <Wordmark />
      <nav aria-label="Landing" className="flex items-center gap-2">
        <a href={REPO_URL} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          GitHub
        </a>
        <ButtonLink to="/home" size="sm">
          Try OpenQuiz
        </ButtonLink>
      </nav>
    </header>
  )
}

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

/** Decorative: a flashcard on a small stack, settling into place. */
function CardStack() {
  const reduce = useReducedMotion()
  const enter = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 28 },
    transition: { duration: 0.4, ease: EASE, delay: 0.12 + i * 0.07 },
  })

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[400px] px-6 py-10 lg:px-4">
      <motion.div
        {...enter(0)}
        animate={{ opacity: 1, y: 16, x: -14, rotate: -6 }}
        className="absolute inset-x-6 inset-y-10 rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface-2)] oq-shadow lg:inset-x-4"
      />
      <motion.div
        {...enter(1)}
        animate={{ opacity: 1, y: 8, x: 12, rotate: 4 }}
        className="absolute inset-x-6 inset-y-10 rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface-2)] oq-shadow lg:inset-x-4"
      />
      <motion.div
        {...enter(2)}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl oq-card oq-shadow-lg p-6 sm:p-7"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--oq-text-faint)]">
            Term
          </span>
          <span className="text-[11px] font-semibold tabular-nums text-[var(--oq-text-faint)]">
            6 / 20
          </span>
        </div>
        <p className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">sanguine</p>
        <p className="mt-2 text-[var(--oq-text-soft)]">Cheerfully optimistic, even when it is hard</p>
        <div className="mt-8 flex items-center gap-2">
          <span className="rounded-full bg-coral/15 px-3 py-1 text-xs font-bold text-coral">
            Still learning
          </span>
          <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-bold text-mint">
            Know it
          </span>
        </div>
      </motion.div>
      <motion.div
        {...enter(3)}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-1 left-2 inline-flex items-center gap-2 rounded-full oq-card px-3 py-1.5 text-xs font-semibold sm:left-0"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-mint text-white">
          <IconCheck width={10} height={10} strokeWidth={3} />
        </span>
        Saved on this device
      </motion.div>
    </div>
  )
}

function Hero() {
  const reduce = useReducedMotion()
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-12%] h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(66, 85, 255, 0.2), transparent)' }}
      />
      <div
        className={clsx(
          WRAP,
          'grid items-center gap-8 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-16',
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--oq-line)] bg-[var(--oq-surface)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--oq-text-soft)]">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
            Free · Open source · Local-first
          </p>
          <h1 className="mt-5 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Seven ways to study.{' '}
            <span className={ACCENT_TEXT}>Nothing to sign up for.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--oq-text-soft)]">
            Free flashcards with every study mode, saved on your device and nowhere else.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink to="/home" size="lg" iconRight={<IconArrowRight />}>
              Try OpenQuiz
            </ButtonLink>
            <a href={REPO_URL} className={buttonClass({ variant: 'secondary', size: 'lg' })}>
              View on GitHub
            </a>
          </div>
          <p className="mt-4 text-sm text-[var(--oq-text-faint)]">
            No account. No ads. Works offline once it has loaded.
          </p>
        </motion.div>
        <CardStack />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Modes
 * ------------------------------------------------------------------ */

function Modes() {
  const reduce = useReducedMotion()
  return (
    <section className={clsx(WRAP, 'py-16 sm:py-24')} aria-labelledby="modes-heading">
      <SectionHeading
        id="modes-heading"
        eyebrow="Study modes"
        title="One set, seven ways to drill it"
        body="Make a set once and practise it however suits the day — flip through it, type it from memory, or race the clock."
      />
      <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {MODES.map((meta, i) => {
          // Flashcards leads: a double-width tile squares off the grid of seven.
          const featured = i === 0
          return (
            <motion.li
              key={meta.mode}
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ duration: 0.26, ease: EASE, delay: i * 0.04 }}
              className={clsx(
                'relative flex flex-col gap-1 overflow-hidden rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] p-4 sm:p-5',
                featured && 'col-span-2',
              )}
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-lg text-white"
                style={{ background: meta.accent }}
                aria-hidden="true"
              >
                {meta.icon}
              </span>
              <h3 className="mt-2 font-bold">{meta.label}</h3>
              <p className="text-[13px] leading-snug text-[var(--oq-text-faint)]">{meta.blurb}</p>
              {featured && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-4 right-5 hidden sm:block"
                >
                  <span
                    className="absolute -left-4 top-3 h-14 w-20 rotate-[-8deg] rounded-lg opacity-30"
                    style={{ background: meta.accent }}
                  />
                  <span
                    className="relative block h-14 w-20 rotate-[4deg] rounded-lg border-2 bg-[var(--oq-surface)]"
                    style={{ borderColor: meta.accent }}
                  />
                </span>
              )}
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Privacy / local-first
 * ------------------------------------------------------------------ */

function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint/15 text-mint"
        aria-hidden="true"
      >
        <IconCheck width={14} height={14} strokeWidth={2.5} />
      </span>
      <p className="text-[15px] leading-relaxed text-[var(--oq-text-soft)]">
        <strong className="font-bold text-[var(--oq-text)]">{title}.</strong> {children}
      </p>
    </li>
  )
}

const LEDGER: { label: string; value: string; local: boolean }[] = [
  { label: 'Study sets', value: 'This browser, on this device', local: true },
  { label: 'Progress', value: 'This browser, on this device', local: true },
  { label: 'Settings', value: 'This browser, on this device', local: true },
  { label: 'Sent to a server', value: 'Never — there is no server', local: false },
  { label: 'Account', value: 'None', local: false },
  { label: 'Trackers, ads', value: 'None', local: false },
]

function DataLedger() {
  return (
    <div className="rounded-2xl oq-card p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Where your data lives</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-mint">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
          Local
        </span>
      </div>
      <dl className="mt-4">
        {LEDGER.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-b border-[var(--oq-line)] py-3 last:border-b-0"
          >
            <dt className="text-sm font-semibold">{row.label}</dt>
            <dd
              className={clsx(
                'text-right text-sm',
                row.local ? 'text-[var(--oq-text-soft)]' : 'font-semibold text-mint',
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-[var(--oq-text-faint)]">
        Storage is your browser’s own database (IndexedDB). Export any set as JSON or CSV, or back
        up everything to one file.
      </p>
    </div>
  )
}

function Privacy() {
  return (
    <section
      className="border-y border-[var(--oq-line)] bg-[var(--oq-surface)]"
      aria-labelledby="privacy-heading"
    >
      <div className={clsx(WRAP, 'grid gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_0.85fr] lg:items-center')}>
        <div>
          <SectionHeading
            id="privacy-heading"
            eyebrow="Local-first"
            title="Your sets never leave your device"
            body="OpenQuiz is a static web app with no server behind it. Everything you type is saved by your browser, on the device you are using, and stays there."
          />
          <Reveal delay={0.05}>
            <ul className="mt-8 space-y-4">
              <Fact title="No server">
                There is nowhere to upload to. Nothing you type is sent over the network — the only
                thing the app ever fetches is its own code.
              </Fact>
              <Fact title="No account">
                Nothing to sign up for, no password to lose, no one who can lock you out.
              </Fact>
              <Fact title="No tracking, no ads">
                No analytics scripts, no ad network, no third parties. Open your browser’s network
                tab while you study and watch nothing happen.
              </Fact>
              <Fact title="Yours to keep">
                Export any set as JSON or CSV, or back up everything to a single file and load it on
                another device.
              </Fact>
            </ul>
            <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--oq-text-faint)]">
              The flip side: nothing is backed up automatically. Clearing your browser’s site data
              removes your sets, so export a backup now and then.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <DataLedger />
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * How it works
 * ------------------------------------------------------------------ */

interface StepMeta {
  title: string
  body: string
  artifact: ReactNode
}

const STEPS: StepMeta[] = [
  {
    title: 'Make a set',
    body: 'Type terms and definitions in, or paste a whole list — a column copied from a spreadsheet works as it is.',
    artifact: (
      <div className="overflow-hidden rounded-lg border border-[var(--oq-line)] bg-[var(--oq-bg)] px-3 py-2 text-[12px] font-medium leading-6">
        <p className="flex gap-2 whitespace-nowrap">
          <span>ephemeral</span>
          <span className="text-[var(--oq-text-faint)]">⇥</span>
          <span className="min-w-0 truncate text-[var(--oq-text-soft)]">lasting a very short time</span>
        </p>
        <p className="flex gap-2 whitespace-nowrap">
          <span>sanguine</span>
          <span className="text-[var(--oq-text-faint)]">⇥</span>
          <span className="min-w-0 truncate text-[var(--oq-text-soft)]">cheerfully optimistic</span>
        </p>
      </div>
    ),
  },
  {
    title: 'Pick a mode',
    body: 'Flip through Flashcards, let Learn quiz you, or race the clock in Match and Gravity. Same set, any mode.',
    artifact: (
      <div className="flex items-center gap-2">
        {MODES.map((meta) => (
          <span
            key={meta.mode}
            className="grid h-7 w-7 place-items-center rounded-md text-white"
            style={{ background: meta.accent }}
          >
            <span className="scale-[0.7]">{meta.icon}</span>
          </span>
        ))}
      </div>
    ),
  },
  {
    title: 'It tracks what you don’t know',
    body: 'Every answer updates a per-term record shared across modes, so the ones you keep missing come back until they stick.',
    artifact: (
      <div>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span>13 mastered</span>
          <span className="text-[var(--oq-text-faint)]">7 to go</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--oq-line)]">
          <div className="h-full w-[65%] rounded-full bg-mint" />
        </div>
      </div>
    ),
  },
]

function HowItWorks() {
  const reduce = useReducedMotion()
  return (
    <section className={clsx(WRAP, 'py-16 sm:py-24')} aria-labelledby="how-heading">
      <SectionHeading id="how-heading" eyebrow="How it works" title="Three steps, no setup" />
      <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, y: reduce ? 0 : 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ duration: 0.3, ease: EASE, delay: i * 0.08 }}
            className="relative flex flex-col"
          >
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-12 right-[-1.5rem] top-5 hidden h-px bg-[var(--oq-line)] md:block"
              />
            )}
            <span
              className="grid h-10 w-10 place-items-center rounded-full bg-indigo-oq text-sm font-extrabold text-white"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <h3 className="mt-5 text-lg font-bold">
              <span className="sr-only">Step {i + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--oq-text-soft)]">{step.body}</p>
            <div className="mt-auto pt-6" aria-hidden="true">
              {step.artifact}
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Closing
 * ------------------------------------------------------------------ */

/** A white face on the indigo band. */
const ON_INDIGO =
  'border-transparent! bg-white! text-indigo-oq! shadow-[0_4px_0_0_rgba(0,0,0,0.25)]! hover:bg-indigo-soft!'

function Closing() {
  return (
    <section className={clsx(WRAP, 'pb-16 sm:pb-24')} aria-labelledby="closing-heading">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl bg-indigo-oq px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-white/5"
          />
          <h2 id="closing-heading" className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready when you are
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/85">
            No account to make. Open it, make a set, start studying.
          </p>
          <div className="relative mt-8 flex justify-center">
            <ButtonLink
              to="/home"
              variant="secondary"
              size="lg"
              className={ON_INDIGO}
              iconRight={<IconArrowRight />}
            >
              Try OpenQuiz
            </ButtonLink>
          </div>
          <p className="relative mt-6 text-sm text-white/75">
            Free and open source under the MIT licence ·{' '}
            <a
              href={REPO_URL}
              className="font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white"
            >
              Read the source
            </a>
          </p>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[var(--oq-line)]">
      <div
        className={clsx(
          WRAP,
          'flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-[var(--oq-text-faint)]',
        )}
      >
        <span>OpenQuiz — free, open-source flashcards that stay on your device.</span>
        <a
          href={REPO_URL}
          className="font-semibold text-[var(--oq-text-soft)] transition-colors hover:text-[var(--oq-text)]"
        >
          GitHub
        </a>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export default function Landing() {
  return (
    <div className="oq-light-only min-h-dvh overflow-x-hidden">
      <Header />
      <Hero />
      <Modes />
      <Privacy />
      <HowItWorks />
      <Closing />
      <Footer />
    </div>
  )
}
