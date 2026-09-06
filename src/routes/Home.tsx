import { Page } from '../components/layout/AppShell'
import { ButtonLink } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icon'

export default function Home() {
  return (
    <Page>
      <section className="rounded-2xl bg-[--color-indigo-oq] px-8 py-14 text-white">
        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Every study mode. None of the noise.
        </h1>
        <p className="mt-4 max-w-xl text-white/85">
          OpenQuiz is a local-first study app. Your sets live on this device — no account, no
          sync, no tracking.
        </p>
        <ButtonLink
          to="/create"
          variant="secondary"
          size="lg"
          className="mt-8 !text-[--color-indigo-oq]"
          icon={<IconPlus />}
        >
          Create your first set
        </ButtonLink>
      </section>
    </Page>
  )
}
