import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { HabitRow } from './HabitRow'

export function HabitsTracker() {
  const habits = useStore((s) => s.habits)
  const addHabit = useStore((s) => s.addHabit)
  const [name, setName] = useState('')

  const submit = () => {
    if (!name.trim()) return
    addHabit(name)
    setName('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          Hábitos diarios
        </h2>
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-zinc-200 px-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {habits.length}
        </span>
      </div>

      <div className="-mx-2 space-y-0.5">
        {habits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} />
        ))}
        {habits.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
            Añade tu primer hábito para empezar
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Nuevo hábito…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Añadir hábito"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
