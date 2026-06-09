import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { CommandCenter } from './components/layout/CommandCenter'
import { KanbanBoard } from './components/kanban/KanbanBoard'
import { usePomodoroEngine } from './components/pomodoro/usePomodoroEngine'

function App() {
  const theme = useStore((s) => s.theme)
  usePomodoroEngine()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <CommandCenter />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <KanbanBoard />
      </main>
    </div>
  )
}

export default App
