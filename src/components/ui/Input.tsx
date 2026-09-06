import clsx from 'clsx'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const FIELD =
  'w-full rounded-lg bg-[var(--oq-surface)] px-4 py-3 text-sm text-[var(--oq-text)] ' +
  'border border-[var(--oq-line)] placeholder:text-[var(--oq-text-faint)] ' +
  'transition-colors focus:border-[--color-indigo-oq] focus:outline-none ' +
  'focus:ring-2 focus:ring-[--color-indigo-oq]/25'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(FIELD, className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(FIELD, 'resize-y', className)} {...rest} />
}

/**
 * The Quizlet-style underlined field used in the set editor: no box, just a
 * rule that turns indigo on focus with a small floating caption beneath.
 */
export function UnderlineInput({
  caption,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { caption?: string }) {
  return (
    <label className="block w-full">
      <input
        className={clsx(
          'peer w-full border-b-[3px] border-[var(--oq-line)] bg-transparent pb-2 pt-3',
          'text-base text-[var(--oq-text)] outline-none transition-colors',
          'placeholder:text-[var(--oq-text-faint)] focus:border-[--color-indigo-oq]',
          className,
        )}
        {...rest}
      />
      {caption && (
        <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--oq-text-faint)] peer-focus:text-[--color-indigo-oq]">
          {caption}
        </span>
      )}
    </label>
  )
}
