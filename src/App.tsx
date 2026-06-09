import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { AppShell } from './components/layout/AppShell'
import { usePomodoroEngine } from './components/pomodoro/usePomodoroEngine'

function App() {
  const theme = useStore((s) => s.theme)
  usePomodoroEngine()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <AppShell />
}

export default App
