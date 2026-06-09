import { CommandCenter } from './CommandCenter'
import { Sidebar } from './Sidebar'
import { KanbanBoard } from '../kanban/KanbanBoard'
import { PomodoroPanel } from '../pomodoro/PomodoroPanel'
import { HabitsTracker } from '../habits/HabitsTracker'

export function AppShell() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <CommandCenter />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[15rem_minmax(0,1fr)_22rem] lg:overflow-hidden">
        <Sidebar />

        <main className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto">
          <KanbanBoard />
        </main>

        <aside className="flex flex-col gap-4 border-t border-zinc-200 p-4 lg:border-t-0 lg:border-l lg:overflow-y-auto dark:border-zinc-800">
          <PomodoroPanel />
          <HabitsTracker />
        </aside>
      </div>
    </div>
  )
}
