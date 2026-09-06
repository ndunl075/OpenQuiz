import { useEffect } from 'react'

type Handler = (event: KeyboardEvent) => void

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

/**
 * Global key bindings. Handlers do not fire while the user is typing
 * unless the binding is prefixed with `!` (e.g. `!Enter`).
 */
export function useKeyboard(bindings: Record<string, Handler | undefined>, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target)
      const direct = bindings[`!${event.key}`]
      if (direct) {
        direct(event)
        return
      }
      if (typing) return
      const handler = bindings[event.key]
      if (handler) {
        event.preventDefault()
        handler(event)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })
}
