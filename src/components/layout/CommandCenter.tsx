import { useState } from 'react'
import { Moon, Pause, Play, RotateCcw, Settings, Sun, Zap } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { formatClock } from '../../lib/time'
import { requestNotificationPermission } from '../../lib/notify'
import { IconButton } from '../ui/IconButton'
import { MODE_META } from '../pomodoro/pomodoro-ui'
import { PomodoroSettings } from '../pomodoro/PomodoroSettings'

export function CommandCenter() {
  const mode = useStore((s) => s.pomodoro.mode)
  const timeRemaining = useStore((s) => s.pomodoro.timeRemaining)
  const isRunning = useStore((s) => s.pomodoro.isRunning)
  const startTimer = useStore((s) => s.startTimer)
  const pauseTimer = useStore((s) => s.pauseTimer)
  const resetTimer = useStore((s) => s.resetTimer)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const meta = MODE_META[mode]

  const handleToggle = () => {
    if (isRunning) {
      pauseTimer()
    } else {
      requestNotificationPermission()
      startTimer()
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-3 backdrop-blur-md sm:gap-4 sm:px-5 dark:border-zinc-800 dark:bg-zinc-900/80">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-600/30">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">FocusHub</p>
            <p className="hidden text-[11px] text-zinc-500 sm:block dark:text-zinc-400">
              Centro de productividad
            </p>
          </div>
        </div>

        {/* Pomodoro cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={`hidden rounded-full px-2.5 py-1 text-xs font-medium md:inline-block ${meta.badge}`}
          >
            {meta.label}
          </span>
          <span className="min-w-[4.5rem] text-center text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
            {formatClock(timeRemaining)}
          </span>
          <IconButton
            variant="primary"
            onClick={handleToggle}
            aria-label={isRunning ? 'Pausar' : 'Iniciar'}
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </IconButton>
          <IconButton variant="soft" onClick={resetTimer} aria-label="Reiniciar">
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <IconButton onClick={() => setSettingsOpen(true)} aria-label="Ajustes del Pomodoro">
            <Settings className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton onClick={toggleTheme} aria-label="Cambiar tema">
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </IconButton>
        </div>
      </header>

      <PomodoroSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
