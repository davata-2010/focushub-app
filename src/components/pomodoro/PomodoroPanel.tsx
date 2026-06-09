import { Pause, Play, RotateCcw } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { formatClock } from '../../lib/time'
import { requestNotificationPermission } from '../../lib/notify'
import { MODE_META, MODE_ORDER, modeDuration } from './pomodoro-ui'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function PomodoroPanel() {
  const mode = useStore((s) => s.pomodoro.mode)
  const timeRemaining = useStore((s) => s.pomodoro.timeRemaining)
  const isRunning = useStore((s) => s.pomodoro.isRunning)
  const sessionsCompleted = useStore((s) => s.pomodoro.sessionsCompleted)
  const settings = useStore((s) => s.pomodoro.settings)
  const startTimer = useStore((s) => s.startTimer)
  const pauseTimer = useStore((s) => s.pauseTimer)
  const resetTimer = useStore((s) => s.resetTimer)
  const switchMode = useStore((s) => s.switchMode)

  const meta = MODE_META[mode]
  const total = modeDuration(mode, settings)
  const fraction = total > 0 ? Math.min(1, Math.max(0, timeRemaining / total)) : 0
  const offset = CIRCUMFERENCE * (1 - fraction)

  const handleToggle = () => {
    if (isRunning) {
      pauseTimer()
    } else {
      requestNotificationPermission()
      startTimer()
    }
  }

  const interval = settings.longBreakInterval
  const inCycle = interval > 0 ? sessionsCompleted % interval : 0

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Mode switch */}
      <div className="mb-5 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/70">
        {MODE_ORDER.map((m) => {
          const active = m === mode
          return (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {MODE_META[m].short}
            </button>
          )
        })}
      </div>

      {/* Progress ring */}
      <div className="relative mx-auto grid h-44 w-44 place-items-center">
        <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            className="stroke-zinc-200 dark:stroke-zinc-800"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke="currentColor"
            className={`${meta.ringText} transition-[stroke-dashoffset] duration-300 ease-linear`}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-4xl font-semibold tracking-tight tabular-nums">
              {formatClock(timeRemaining)}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {meta.label}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/30 transition-colors hover:bg-violet-500"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? 'Pausar' : 'Iniciar'}
        </button>
        <button
          type="button"
          onClick={resetTimer}
          aria-label="Reiniciar"
          className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Session tracker */}
      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Sesiones completadas</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: interval }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i < inCycle ? 'bg-violet-500' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
            {sessionsCompleted}
          </span>
        </div>
      </div>
    </section>
  )
}
