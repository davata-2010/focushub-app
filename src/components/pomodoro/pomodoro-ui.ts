import type { PomodoroMode, PomodoroSettings } from '../../types'

export interface ModeMeta {
  label: string
  /** Compact label for the segmented switch. */
  short: string
  /** Pill badge classes (background + text). */
  badge: string
  /** `text-*` color used as `currentColor` for the SVG progress ring. */
  ringText: string
  /** Small status dot background. */
  dot: string
}

export const MODE_META: Record<PomodoroMode, ModeMeta> = {
  focus: {
    label: 'Enfoque',
    short: 'Enfoque',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
    ringText: 'text-violet-500',
    dot: 'bg-violet-500',
  },
  shortBreak: {
    label: 'Descanso corto',
    short: 'Corto',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    ringText: 'text-emerald-500',
    dot: 'bg-emerald-500',
  },
  longBreak: {
    label: 'Descanso largo',
    short: 'Largo',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
    ringText: 'text-sky-500',
    dot: 'bg-sky-500',
  },
}

export const MODE_ORDER: PomodoroMode[] = ['focus', 'shortBreak', 'longBreak']

/** Total seconds for a mode under the given settings. */
export function modeDuration(mode: PomodoroMode, s: PomodoroSettings): number {
  if (mode === 'focus') return s.focusMin * 60
  if (mode === 'shortBreak') return s.shortBreakMin * 60
  return s.longBreakMin * 60
}
