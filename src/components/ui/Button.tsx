import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface Common {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
  className?: string
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-[52px] px-7 text-base gap-2',
}

/**
 * The raised block button: a solid face sitting on a darker 4px edge that
 * collapses on press. Defined once here so the tactile feel is identical
 * everywhere in the app.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-oq text-white shadow-[0_4px_0_0_var(--color-indigo-dark)] hover:bg-indigo-hover active:translate-y-[4px] active:shadow-none',
  secondary:
    'bg-[var(--oq-raised)] text-[var(--oq-text)] border border-[var(--oq-line)] shadow-[0_4px_0_0_var(--oq-line)] hover:bg-[var(--oq-surface-2)] active:translate-y-[4px] active:shadow-none',
  outline:
    'bg-transparent text-indigo-oq border-2 border-indigo-oq hover:bg-indigo-soft active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--oq-text)] hover:bg-[var(--oq-surface-2)] active:scale-[0.98]',
  danger:
    'bg-coral text-white shadow-[0_4px_0_0_#c2452f] hover:brightness-105 active:translate-y-[4px] active:shadow-none',
}

const BASE =
  'inline-flex items-center justify-center rounded-lg font-semibold select-none ' +
  'transition-[background-color,transform,box-shadow,filter] duration-100 ' +
  'disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap'

export function buttonClass({
  variant = 'primary',
  size = 'md',
  block,
  className,
}: Common = {}): string {
  return clsx(BASE, SIZES[size], VARIANTS[variant], block && 'w-full', className)
}

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant,
  size,
  block,
  icon,
  iconRight,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClass({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  )
}

type ButtonLinkProps = Common & { to: string; state?: unknown; title?: string }

export function ButtonLink({
  to,
  state,
  variant,
  size,
  block,
  icon,
  iconRight,
  className,
  children,
  title,
}: ButtonLinkProps) {
  return (
    <Link
      to={to}
      state={state}
      title={title}
      className={buttonClass({ variant, size, block, className })}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  size?: 'sm' | 'md'
}

export function IconButton({
  label,
  active,
  size = 'md',
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(
        'touch-target inline-flex items-center justify-center rounded-full transition-colors duration-100',
        'text-[var(--oq-text-soft)] hover:bg-[var(--oq-surface-2)] hover:text-[var(--oq-text)]',
        'disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        active && 'text-indigo-oq',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
