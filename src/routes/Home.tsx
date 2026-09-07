import { useMemo } from 'react'
import { Page } from '../components/layout/AppShell'
import { EmptyState, SetCard, SetCardGrid } from '../components/SetCard'
import { ButtonLink } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icon'
import { useAsync } from '../hooks/useAsync'
import { listSets } from '../store/sets'
import { pluralize } from '../lib/format'

/** The signed-in-feeling dashboard. The pitch lives on the landing page. */
export default function Home() {
  const { value: sets = [], loading } = useAsync(listSets, [])
  const recent = useMemo(() => sets.slice(0, 6), [sets])
  const termCount = useMemo(() => sets.reduce((n, s) => n + s.terms.length, 0), [sets])

  if (loading) return <Page width="max-w-[1200px]" />

  return (
    <Page width="max-w-[1200px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">
            {sets.length === 0 ? 'Your sets' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--oq-text-soft)]">
            {sets.length === 0
              ? 'Nothing here yet — make your first set to start studying.'
              : `${pluralize(sets.length, 'set')} · ${pluralize(termCount, 'term')} on this device`}
          </p>
        </div>
        <ButtonLink to="/create" icon={<IconPlus width={16} height={16} />} size="sm">
          New set
        </ButtonLink>
      </header>

      {sets.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing to study yet"
            body="Create a set by hand, or paste a list you already have — tab-separated straight out of a spreadsheet works."
            action={<ButtonLink to="/create">Create a set</ButtonLink>}
          />
        </div>
      ) : (
        <>
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
