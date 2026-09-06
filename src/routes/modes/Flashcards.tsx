import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ModeChrome, ModeLoading, NotEnoughTerms } from '../../components/study/ModeChrome'
import { CardText, FlipCard } from '../../components/study/FlipCard'
import { Button, IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Segmented, Toggle } from '../../components/ui/Toggle'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconPause,
  IconPlay,
  IconShuffle,
  IconSound,
  IconStar,
  IconUndo,
} from '../../components/ui/Icon'
import NotFound from '../NotFound'
import { useDeck, useStudySet } from '../../hooks/useStudySet'
import { useKeyboard } from '../../hooks/useKeyboard'
import { setKnown } from '../../store/progress'
import { toggleStar } from '../../store/sets'
import { useSettings } from '../../store/useSettings'
import { speak } from '../../lib/tts'
import type { PromptSide } from '../../lib/types'

type Sorted = Record<string, 'known' | 'learning'>

export default function Flashcards() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { set, loading, reloadSet } = useStudySet(id)
  const { settings, update } = useSettings()

  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [direction, setDirection] = useState(1)
  const [shuffled, setShuffled] = useState(settings.shuffleDefault)
  const [starredOnly, setStarredOnly] = useState(false)
  const [seed, setSeed] = useState(1)
  const [autoplay, setAutoplay] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [sortMode, setSortMode] = useState(false)
  const [sorted, setSorted] = useState<Sorted>({})
  /** When set, the deck is narrowed to just these ids (review-what-you-missed). */
  const [restrictIds, setRestrictIds] = useState<string[] | null>(null)

  const pool = useMemo(
    () =>
      restrictIds ? (set?.terms ?? []).filter((t) => restrictIds.includes(t.id)) : set?.terms,
    [set?.terms, restrictIds],
  )
  const deck = useDeck(pool, { shuffled, starredOnly, seed })
  const current = deck[index]
  const finished = index >= deck.length && deck.length > 0

  const promptSide: PromptSide = settings.promptSide
  const frontText = current ? (promptSide === 'term' ? current.term : current.definition) : ''
  const backText = current ? (promptSide === 'term' ? current.definition : current.term) : ''
  const frontLang = set ? (promptSide === 'term' ? set.termLang : set.defLang) : 'en-US'

  const tally = useMemo(() => {
    const values = Object.values(sorted)
    return {
      known: values.filter((v) => v === 'known').length,
      learning: values.filter((v) => v === 'learning').length,
    }
  }, [sorted])

  const go = useCallback(
    (delta: number) => {
      setDirection(delta)
      setFlipped(false)
      setIndex((i) => Math.min(deck.length, Math.max(0, i + delta)))
    },
    [deck.length],
  )

  const sortCurrent = useCallback(
    async (verdict: 'known' | 'learning') => {
      if (!current) return
      setSorted((s) => ({ ...s, [current.id]: verdict }))
      await setKnown(id, current.id, verdict === 'known')
      go(1)
    },
    [current, go, id],
  )

  const restart = useCallback(
    (onlyMissed = false) => {
      if (onlyMissed) {
        const missed = Object.entries(sorted)
          .filter(([, verdict]) => verdict === 'learning')
          .map(([termId]) => termId)
        if (missed.length === 0) return
        setRestrictIds(missed)
        setStarredOnly(false)
      } else {
        setRestrictIds(null)
      }
      setSorted({})
      setIndex(0)
      setFlipped(false)
    },
    [sorted],
  )

  // Autoplay: reveal, then advance.
  useEffect(() => {
    if (!autoplay || finished || !current) return
    const timer = setTimeout(() => {
      if (flipped) go(1)
      else setFlipped(true)
    }, flipped ? 2600 : 2200)
    return () => clearTimeout(timer)
  }, [autoplay, flipped, current, finished, go])

  useKeyboard({
    ArrowLeft: () => go(-1),
    ArrowRight: () => go(1),
    ' ': () => setFlipped((f) => !f),
    Enter: () => setFlipped((f) => !f),
    a: () => sortMode && void sortCurrent('learning'),
    d: () => sortMode && void sortCurrent('known'),
    s: () => current && speak(frontText, frontLang),
  })

  if (loading) return <ModeLoading />
  if (!set) return <NotFound />
  if (set.terms.length === 0) return <NotEnoughTerms setId={id} need={1} />

  return (
    <ModeChrome
      setId={id}
      title="Flashcards"
      subtitle={set.title}
      progress={{ value: Math.min(index, deck.length), max: deck.length }}
      onSettings={() => setOptionsOpen(true)}
      actions={
        <>
          <IconButton
            label={shuffled ? 'Turn shuffle off' : 'Shuffle cards'}
            active={shuffled}
            onClick={() => {
              setShuffled((s) => !s)
              setSeed(Date.now() % 100000)
              setIndex(0)
              setFlipped(false)
            }}
          >
            <IconShuffle />
          </IconButton>
          <IconButton
            label={autoplay ? 'Pause autoplay' : 'Play cards automatically'}
            active={autoplay}
            onClick={() => setAutoplay((p) => !p)}
          >
            {autoplay ? <IconPause /> : <IconPlay />}
          </IconButton>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-4 pb-10 sm:px-6">
        {sortMode && !finished && (
          <div className="mb-4 flex items-center justify-between text-sm font-bold">
            <span className="rounded-full bg-coral-soft px-3 py-1 text-[#a63a28]">
              {tally.learning} still learning
            </span>
            <span className="rounded-full bg-mint-soft px-3 py-1 text-[#12794a]">
              {tally.known} know
            </span>
          </div>
        )}

        <div className="relative flex flex-1 items-center">
          <AnimatePresence mode="wait" custom={direction}>
            {finished ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-14 text-center oq-shadow"
              >
                <h2 className="text-2xl font-extrabold">You finished the deck</h2>
                {sortMode ? (
                  <p className="mt-3 text-sm text-[var(--oq-text-soft)]">
                    {tally.known} known · {tally.learning} still learning
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-[var(--oq-text-soft)]">
                    {deck.length} cards reviewed
                  </p>
                )}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button onClick={() => restart()}>Study again</Button>
                  {tally.learning > 0 && (
                    <Button variant="secondary" onClick={() => restart(true)}>
                      Review the {tally.learning} you missed
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => navigate(`/set/${id}/learn`)}>
                    Try Learn mode
                  </Button>
                </div>
              </motion.div>
            ) : (
              current && (
                <FlipCard
                  key={current.id}
                  direction={direction}
                  flipped={flipped}
                  onFlip={() => setFlipped((f) => !f)}
                  topLeft={
                    <IconButton
                      label="Read aloud"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        speak(flipped ? backText : frontText, frontLang)
                      }}
                    >
                      <IconSound width={18} height={18} />
                    </IconButton>
                  }
                  topRight={
                    <IconButton
                      label={current.starred ? 'Unstar this card' : 'Star this card'}
                      size="sm"
                      active={current.starred}
                      onClick={async (e) => {
                        e.stopPropagation()
                        await toggleStar(id, current.id)
                        await reloadSet()
                      }}
                    >
                      <IconStar width={18} height={18} filled={current.starred} />
                    </IconButton>
                  }
                  front={
                    <>
                      <span className="absolute top-16 text-[11px] font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
                        {promptSide === 'term' ? 'Term' : 'Definition'}
                      </span>
                      <CardText>{frontText}</CardText>
                      <span className="absolute bottom-6 text-xs text-[var(--oq-text-faint)]">
                        Click or press Space to flip
                      </span>
                    </>
                  }
                  back={
                    <>
                      <span className="absolute top-16 text-[11px] font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
                        {promptSide === 'term' ? 'Definition' : 'Term'}
                      </span>
                      <CardText>{backText}</CardText>
                    </>
                  }
                />
              )
            )}
          </AnimatePresence>
        </div>

        {!finished && (
          <div className="mt-6">
            {sortMode ? (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="lg"
                  className="!border-coral !text-coral !shadow-[0_4px_0_0_var(--color-coral)]"
                  icon={<IconClose />}
                  onClick={() => void sortCurrent('learning')}
                >
                  Still learning
                </Button>
                <span className="text-sm font-bold text-[var(--oq-text-faint)]">
                  {Math.min(index + 1, deck.length)} / {deck.length}
                </span>
                <Button
                  variant="secondary"
                  size="lg"
                  className="!border-mint !text-mint !shadow-[0_4px_0_0_var(--color-mint)]"
                  icon={<IconCheck />}
                  onClick={() => void sortCurrent('known')}
                >
                  Know it
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6">
                <IconButton
                  label="Previous card"
                  onClick={() => go(-1)}
                  disabled={index === 0}
                  className="!h-12 !w-12 border border-[var(--oq-line)]"
                >
                  <IconArrowLeft />
                </IconButton>
                <span className="min-w-[72px] text-center text-sm font-bold">
                  {Math.min(index + 1, deck.length)} / {deck.length}
                </span>
                <IconButton
                  label="Next card"
                  onClick={() => go(1)}
                  className="!h-12 !w-12 border border-[var(--oq-line)]"
                >
                  <IconArrowRight />
                </IconButton>
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSortMode((s) => !s)
                  setSorted({})
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--oq-text-soft)] hover:bg-[var(--oq-surface)]"
              >
                {sortMode ? 'Just flip through' : 'Sort by Know / Still learning'}
              </button>
              {index > 0 && (
                <button
                  onClick={() => restart()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--oq-text-soft)] hover:bg-[var(--oq-surface)]"
                >
                  <IconUndo width={14} height={14} /> Start over
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Options">
        <div className="divide-y divide-[var(--oq-line)]">
          <div className="pb-4">
            <p className="mb-2 text-sm font-semibold">Front of card</p>
            <Segmented
              value={settings.promptSide}
              onChange={(promptSide) => void update({ promptSide })}
              options={[
                { value: 'term', label: 'Term' },
                { value: 'definition', label: 'Definition' },
              ]}
            />
          </div>
          <Toggle
            label="Shuffle"
            hint="Randomise the order of the deck"
            checked={shuffled}
            onChange={(v) => {
              setShuffled(v)
              setSeed(Date.now() % 100000)
              setIndex(0)
            }}
          />
          <Toggle
            label="Starred terms only"
            hint="Skip everything you haven't starred"
            checked={starredOnly}
            onChange={(v) => {
              setStarredOnly(v)
              setIndex(0)
            }}
          />
          <Toggle
            label="Autoplay"
            hint="Flip and advance automatically"
            checked={autoplay}
            onChange={setAutoplay}
          />
        </div>
      </Modal>
    </ModeChrome>
  )
}
