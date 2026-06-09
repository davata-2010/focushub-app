import type { Priority, Status } from '../../types'

export interface PriorityMeta {
  label: string
  /** Left accent bar on the card. */
  bar: string
  /** Small dot. */
  dot: string
  /** Pill badge (background + text). */
  badge: string
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  low: {
    label: 'Baja',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  },
  medium: {
    label: 'Media',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  },
  high: {
    label: 'Alta',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  },
}

/** Column header accent dot, keyed by status. */
export const STATUS_ACCENT: Record<Status, string> = {
  todo: 'bg-zinc-400 dark:bg-zinc-500',
  'in-progress': 'bg-violet-500',
  done: 'bg-emerald-500',
}
