import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'ghost' | 'primary' | 'soft' | 'danger'

const VARIANTS: Record<Variant, string> = {
  ghost:
    'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  primary:
    'bg-violet-600 text-white shadow-sm shadow-violet-600/30 hover:bg-violet-500',
  soft: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
  danger:
    'text-zinc-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400',
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function IconButton({
  variant = 'ghost',
  className = '',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
