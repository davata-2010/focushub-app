import type { LucideIcon } from 'lucide-react'
import { BarChart3, CalendarCheck, LayoutGrid, Timer } from 'lucide-react'
import { useStore } from '../../store/useStore'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { id: 'board', label: 'Tablero', icon: LayoutGrid },
  { id: 'habits', label: 'Hábitos', icon: CalendarCheck },
  { id: 'focus', label: 'Enfoque', icon: Timer },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
]

export function Sidebar() {
  const tasks = useStore((s) => s.tasks)
  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <aside className="hidden border-r border-zinc-200 bg-white/50 p-4 lg:flex lg:flex-col dark:border-zinc-800 dark:bg-zinc-900/40">
      <nav className="space-y-1">
        {NAV.map((item, i) => {
          const Icon = item.icon
          const active = i === 0
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Progreso</span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">
            {done}/{total}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
          {pct}% de tareas completadas
        </p>
      </div>
    </aside>
  )
}
