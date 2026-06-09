import { Check, Flame, Trash2 } from 'lucide-react'
import type { Habit } from '../../types'
import { useStore } from '../../store/useStore'
import { computeStreak, lastNDays, todayKey, weekdayNarrow } from '../../lib/date'

export function HabitRow({ habit }: { habit: Habit }) {
  const toggle = useStore((s) => s.toggleHabitForDate)
  const remove = useStore((s) => s.deleteHabit)

  const done = new Set(habit.completedDates)
  const todayDone = done.has(todayKey())
  const streak = computeStreak(habit.completedDates)
  const week = lastNDays(7)

  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <button
        type="button"
        onClick={() => toggle(habit.id)}
        aria-pressed={todayDone}
        aria-label={`Marcar "${habit.name}" como completado hoy`}
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors ${
          todayDone
            ? 'border-violet-600 bg-violet-600 text-white'
            : 'border-zinc-300 text-transparent hover:border-violet-500 dark:border-zinc-600'
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            todayDone
              ? 'text-zinc-400 line-through dark:text-zinc-500'
              : 'text-zinc-700 dark:text-zinc-200'
          }`}
        >
          {habit.name}
        </p>
        <div className="mt-1 flex items-center gap-1">
          {week.map((d) => (
            <span
              key={d}
              title={weekdayNarrow(d)}
              className={`h-1.5 w-4 rounded-full ${
                done.has(d) ? 'bg-violet-500' : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>

      {streak > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-300">
          <Flame className="h-3.5 w-3.5" />
          {streak}
        </span>
      )}

      <button
        type="button"
        onClick={() => remove(habit.id)}
        aria-label="Eliminar hábito"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
