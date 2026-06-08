// Shared domain types for FocusHub.
// NOTE: tsconfig uses `erasableSyntaxOnly`, so we model enums as string
// unions + `const` maps instead of TS `enum`s.

export type Priority = 'low' | 'medium' | 'high'

export type Status = 'todo' | 'in-progress' | 'done'

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  status: Status
  /** ISO date string (yyyy-mm-dd) or undefined when no due date. */
  dueDate?: string
  tags: string[]
  createdAt: number
}

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'

export interface PomodoroSettings {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  /** Take a long break after this many focus sessions. */
  longBreakInterval: number
  /** Automatically start the next phase when one finishes. */
  autoStart: boolean
}

export interface Habit {
  id: string
  name: string
  /** List of yyyy-mm-dd keys on which the habit was completed. */
  completedDates: string[]
  createdAt: number
}

export type Theme = 'dark' | 'light'

export interface ColumnDef {
  id: Status
  title: string
}

export const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'Por hacer' },
  { id: 'in-progress', title: 'En progreso' },
  { id: 'done', title: 'Hecho' },
]

export const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high']

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}
