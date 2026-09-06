import { useMemo } from 'react'
import { Page } from '../components/layout/AppShell'
import { EmptyState, SetCard, SetCardGrid } from '../components/SetCard'
import { ButtonLink } from '../components/ui/Button'
import { IconLightning, IconPlus } from '../components/ui/Icon'
import { useAsync } from '../hooks/useAsync'
import { listSets } from '../store/sets'
import { pluralize } from '../lib/format'

export default function Home() {
  const { value: sets = [], loading } = useAsync(listSets, [])
  const recent = useMemo(() => sets.slice(0, 6), [sets])
  const termCount = useMemo(() => sets.reduce((n, s) => n + s.terms.length, 0), [sets])

  return (
    <Page width="max-w-[1200px]">
      {sets.length === 0 && !loading ? (
        <>
          <section className="overflow-hidden rounded-2xl bg-indigo-oq px-8 py-14 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              <IconLightning width={13} height={13} /> Local-first
            </span>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.1] sm:text-5xl">
              Every study mode. None of the noise.
            </h1>
            <p className="mt-4 max-w-xl text-white/85">
              Flashcards, Learn, Write, Spell, Test, Match and Gravity. No account, no cloud, no
              tracking — your sets are stored on this device and nowhere else.
            </p>
            <ButtonLink
              to="/create"
              variant="secondary"
              size="lg"
              className="mt-8 !text-indigo-oq"
              icon={<IconPlus />}
            >
              Create your first set
            </ButtonLink>
          </section>

          <div className="mt-8">
            <EmptyState
              title="Nothing to study yet"
              body="Create a set by hand, or paste a list you already have — tab-separated straight out of a spreadsheet works."
              action={<ButtonLink to="/create">Create a set</ButtonLink>}
            />
          </div>
        </>
      ) : (
        <>
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold">Welcome back</h1>
              <p className="mt-1.5 text-sm text-[var(--oq-text-soft)]">
                {pluralize(sets.length, 'set')} · {pluralize(termCount, 'term')} on this device
              </p>
            </div>
            <ButtonLink to="/create" icon={<IconPlus width={16} height={16} />} size="sm">
              New set
            </ButtonLink>
          </header>

          <section className="mt-8">
            <h2 className="mb-4 text-lg font-bold">Recent</h2>
            <SetCardGrid>
              {recent.map((set) => (
                <SetCard key={set.id} set={set} />
              ))}
            </SetCardGrid>
          </section>

          {sets.length > recent.length && (
            <div className="mt-8 flex justify-center">
              <ButtonLink to="/library" variant="secondary">
                See all {sets.length} sets
              </ButtonLink>
            </div>
          )}
        </>
      )}
    </Page>
  )
}
