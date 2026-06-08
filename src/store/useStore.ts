import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import { arrayMove } from '@dnd-kit/sortable'
import localforage from 'localforage'
import type {
  Habit,
  PomodoroMode,
  PomodoroSettings,
  Priority,
  Status,
  Task,
  Theme,
} from '../types'
import { todayKey } from '../lib/date'
import { notifyPhase } from '../lib/notify'

// ---------------------------------------------------------------------------
// Defaults & helpers
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakInterval: 4,
  autoStart: false,
}

function durationFor(mode: PomodoroMode, s: PomodoroSettings): number {
  switch (mode) {
    case 'focus':
      return s.focusMin * 60
    case 'shortBreak':
      return s.shortBreakMin * 60
    case 'longBreak':
      return s.longBreakMin * 60
  }
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const MODE_LABEL: Record<PomodoroMode, string> = {
  focus: 'enfoque',
  shortBreak: 'descanso corto',
  longBreak: 'descanso largo',
}

// First-run sample data so the dashboard looks alive immediately.
function seedTasks(): Task[] {
  const now = Date.now()
  return [
    {
      id: uid(),
      title: 'Diseñar el dashboard de FocusHub',
      description: 'Layout de 3 zonas con modo oscuro por defecto.',
      priority: 'high',
      status: 'in-progress',
      tags: ['diseño', 'ui'],
      dueDate: todayKey(),
      createdAt: now,
    },
    {
      id: uid(),
      title: 'Configurar el tablero Kanban',
      priority: 'medium',
      status: 'todo',
      tags: ['dev'],
      createdAt: now + 1,
    },
    {
      id: uid(),
      title: 'Definir mis hábitos diarios',
      priority: 'low',
      status: 'todo',
      tags: ['personal'],
      createdAt: now + 2,
    },
    {
      id: uid(),
      title: 'Sesión de enfoque profundo',
      description: '4 pomodoros sin distracciones.',
      priority: 'medium',
      status: 'done',
      tags: ['focus'],
      createdAt: now + 3,
    },
  ]
}

function seedHabits(): Habit[] {
  const now = Date.now()
  return [
    { id: uid(), name: 'Leer 20 minutos', completedDates: [todayKey()], createdAt: now },
    { id: uid(), name: 'Hacer ejercicio', completedDates: [], createdAt: now + 1 },
    { id: uid(), name: 'Meditar', completedDates: [], createdAt: now + 2 },
  ]
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface PomodoroState {
  mode: PomodoroMode
  timeRemaining: number // seconds left in the current phase
  isRunning: boolean
  endTime: number | null // epoch ms target while running (drift-free source)
  sessionsCompleted: number
  settings: PomodoroSettings
}

export interface NewTaskInput {
  title: string
  status: Status
  priority?: Priority
  description?: string
  dueDate?: string
  tags?: string[]
}

export interface FocusHubState {
  // Tasks ------------------------------------------------------------------
  tasks: Task[]
  addTask: (input: NewTaskInput) => void
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  deleteTask: (id: string) => void
  /** Move a task to another column, inserting before `overId` when given. */
  moveTask: (activeId: string, toStatus: Status, overId?: string) => void
  /** Reorder two tasks that live in the same column. */
  reorderTasks: (activeId: string, overId: string) => void

  // Pomodoro ---------------------------------------------------------------
  pomodoro: PomodoroState
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  tickTimer: () => void
  switchMode: (mode: PomodoroMode) => void
  updateSettings: (patch: Partial<PomodoroSettings>) => void

  // Habits -----------------------------------------------------------------
  habits: Habit[]
  addHabit: (name: string) => void
  deleteHabit: (id: string) => void
  toggleHabitForDate: (id: string, dateKey?: string) => void

  // Theme ------------------------------------------------------------------
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

// Subset of state that is persisted to IndexedDB.
interface PersistedState {
  tasks?: Task[]
  habits?: Habit[]
  theme?: Theme
  pomodoro?: {
    mode?: PomodoroMode
    sessionsCompleted?: number
    settings?: Partial<PomodoroSettings>
  }
}

// ---------------------------------------------------------------------------
// Persistence backend: localforage (IndexedDB)
// ---------------------------------------------------------------------------

localforage.config({
  name: 'FocusHub',
  storeName: 'focushub_state',
  description: 'Estado persistente de FocusHub',
})

const indexedDbStorage: StateStorage = {
  getItem: async (name) => {
    const value = await localforage.getItem<string>(name)
    return value ?? null
  },
  setItem: async (name, value) => {
    await localforage.setItem(name, value)
  },
  removeItem: async (name) => {
    await localforage.removeItem(name)
  },
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<FocusHubState>()(
  persist(
    (set, get) => ({
      // --- Tasks ---
      tasks: seedTasks(),

      addTask: (input) =>
        set((state) => {
          const title = input.title.trim()
          if (!title) return {}
          const task: Task = {
            id: uid(),
            title,
            description: input.description?.trim() || undefined,
            priority: input.priority ?? 'medium',
            status: input.status,
            dueDate: input.dueDate || undefined,
            tags: input.tags ?? [],
            createdAt: Date.now(),
          }
          return { tasks: [...state.tasks, task] }
        }),

      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      deleteTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

      moveTask: (activeId, toStatus, overId) =>
        set((state) => {
          const idx = state.tasks.findIndex((t) => t.id === activeId)
          if (idx === -1) return {}
          const tasks = state.tasks.slice()
          const [moved] = tasks.splice(idx, 1)
          const updated: Task = { ...moved, status: toStatus }
          let insertIdx = tasks.length
          if (overId && overId !== toStatus) {
            const overIdx = tasks.findIndex((t) => t.id === overId)
            if (overIdx !== -1) insertIdx = overIdx
          }
          tasks.splice(insertIdx, 0, updated)
          return { tasks }
        }),

      reorderTasks: (activeId, overId) =>
        set((state) => {
          const from = state.tasks.findIndex((t) => t.id === activeId)
          const to = state.tasks.findIndex((t) => t.id === overId)
          if (from === -1 || to === -1 || from === to) return {}
          return { tasks: arrayMove(state.tasks, from, to) }
        }),

      // --- Pomodoro ---
      pomodoro: {
        mode: 'focus',
        timeRemaining: DEFAULT_SETTINGS.focusMin * 60,
        isRunning: false,
        endTime: null,
        sessionsCompleted: 0,
        settings: DEFAULT_SETTINGS,
      },

      startTimer: () =>
        set((state) => {
          const p = state.pomodoro
          if (p.isRunning) return {}
          const seconds =
            p.timeRemaining > 0 ? p.timeRemaining : durationFor(p.mode, p.settings)
          return {
            pomodoro: {
              ...p,
              isRunning: true,
              timeRemaining: seconds,
              endTime: Date.now() + seconds * 1000,
            },
          }
        }),

      pauseTimer: () =>
        set((state) => {
          const p = state.pomodoro
          if (!p.isRunning) return {}
          const remaining = p.endTime
            ? Math.max(0, Math.round((p.endTime - Date.now()) / 1000))
            : p.timeRemaining
          return { pomodoro: { ...p, isRunning: false, endTime: null, timeRemaining: remaining } }
        }),

      resetTimer: () =>
        set((state) => {
          const p = state.pomodoro
          return {
            pomodoro: {
              ...p,
              isRunning: false,
              endTime: null,
              timeRemaining: durationFor(p.mode, p.settings),
            },
          }
        }),

      switchMode: (mode) =>
        set((state) => {
          const p = state.pomodoro
          return {
            pomodoro: {
              ...p,
              mode,
              isRunning: false,
              endTime: null,
              timeRemaining: durationFor(mode, p.settings),
            },
          }
        }),

      updateSettings: (patch) =>
        set((state) => {
          const p = state.pomodoro
          const settings = { ...p.settings, ...patch }
          const timeRemaining = p.isRunning
            ? p.timeRemaining
            : durationFor(p.mode, settings)
          return { pomodoro: { ...p, settings, timeRemaining } }
        }),

      tickTimer: () => {
        const p = get().pomodoro
        if (!p.isRunning || p.endTime == null) return
        const remaining = Math.round((p.endTime - Date.now()) / 1000)
        if (remaining > 0) {
          set({ pomodoro: { ...p, timeRemaining: remaining } })
          return
        }
        // Current phase finished — advance to the next one.
        const s = p.settings
        let sessions = p.sessionsCompleted
        let nextMode: PomodoroMode
        if (p.mode === 'focus') {
          sessions += 1
          nextMode = sessions % s.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
        } else {
          nextMode = 'focus'
        }
        const nextDuration = durationFor(nextMode, s)
        const autoStart = s.autoStart
        set({
          pomodoro: {
            ...p,
            mode: nextMode,
            sessionsCompleted: sessions,
            timeRemaining: nextDuration,
            isRunning: autoStart,
            endTime: autoStart ? Date.now() + nextDuration * 1000 : null,
          },
        })
        notifyPhase(
          p.mode === 'focus'
            ? `¡Sesión de enfoque completada! Hora de un ${MODE_LABEL[nextMode]}.`
            : '¡Descanso terminado! Volvamos al enfoque.',
        )
      },

      // --- Habits ---
      habits: seedHabits(),

      addHabit: (name) =>
        set((state) => {
          const trimmed = name.trim()
          if (!trimmed) return {}
          return {
            habits: [
              ...state.habits,
              { id: uid(), name: trimmed, completedDates: [], createdAt: Date.now() },
            ],
          }
        }),

      deleteHabit: (id) =>
        set((state) => ({ habits: state.habits.filter((h) => h.id !== id) })),

      toggleHabitForDate: (id, dateKey) =>
        set((state) => {
          const key = dateKey ?? todayKey()
          return {
            habits: state.habits.map((h) => {
              if (h.id !== id) return h
              const has = h.completedDates.includes(key)
              return {
                ...h,
                completedDates: has
                  ? h.completedDates.filter((d) => d !== key)
                  : [...h.completedDates, key],
              }
            }),
          }
        }),

      // --- Theme ---
      theme: 'dark',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'focushub-storage',
      version: 1,
      storage: createJSONStorage(() => indexedDbStorage),
      // Persist only data; timer runtime fields are reconstructed on load.
      partialize: (state) => ({
        tasks: state.tasks,
        habits: state.habits,
        theme: state.theme,
        pomodoro: {
          mode: state.pomodoro.mode,
          sessionsCompleted: state.pomodoro.sessionsCompleted,
          settings: state.pomodoro.settings,
        },
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as PersistedState
        const pomo = persisted.pomodoro ?? {}
        const settings = { ...DEFAULT_SETTINGS, ...(pomo.settings ?? {}) }
        const mode = pomo.mode ?? currentState.pomodoro.mode
        return {
          ...currentState,
          tasks: persisted.tasks ?? currentState.tasks,
          habits: persisted.habits ?? currentState.habits,
          theme: persisted.theme ?? currentState.theme,
          pomodoro: {
            ...currentState.pomodoro,
            mode,
            sessionsCompleted: pomo.sessionsCompleted ?? 0,
            settings,
            isRunning: false,
            endTime: null,
            timeRemaining: durationFor(mode, settings),
          },
        }
      },
    },
  ),
)
