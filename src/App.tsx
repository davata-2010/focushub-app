import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { CommandCenter } from './components/layout/CommandCenter'
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
      <main className="grid flex-1 place-items-center p-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          El tablero Kanban y los paneles llegan en las siguientes fases…
        </p>
      </main>
    </div>
  )
}

export default App
