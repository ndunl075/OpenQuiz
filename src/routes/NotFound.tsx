import { Page } from '../components/layout/AppShell'
import { ButtonLink } from '../components/ui/Button'

export default function NotFound() {
  return (
    <Page width="max-w-xl" className="text-center">
      <h1 className="mt-16 text-6xl font-extrabold text-indigo-oq">404</h1>
      <p className="mt-4 text-lg font-semibold">We couldn't find that page.</p>
      <p className="mt-2 text-sm text-[var(--oq-text-soft)]">
        The set may have been deleted from this device.
      </p>
      <ButtonLink to="/" className="mt-8">
        Back home
      </ButtonLink>
    </Page>
  )
}
