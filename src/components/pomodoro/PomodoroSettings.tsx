import { X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { PomodoroSettings as Settings } from '../../types'
import { clamp } from '../../lib/time'
import { IconButton } from '../ui/IconButton'

interface PomodoroSettingsProps {
  open: boolean
  onClose: () => void
}

type NumericField = 'focusMin' | 'shortBreakMin' | 'longBreakMin' | 'longBreakInterval'

const FIELDS: { key: NumericField; label: string; suffix: string; min: number; max: number }[] = [
  { key: 'focusMin', label: 'Enfoque', suffix: 'min', min: 1, max: 90 },
  { key: 'shortBreakMin', label: 'Descanso corto', suffix: 'min', min: 1, max: 30 },
  { key: 'longBreakMin', label: 'Descanso largo', suffix: 'min', min: 1, max: 60 },
  { key: 'longBreakInterval', label: 'Descanso largo cada', suffix: 'sesiones', min: 2, max: 8 },
]

export function PomodoroSettings({ open, onClose }: PomodoroSettingsProps) {
  const settings = useStore((s) => s.pomodoro.settings)
  const updateSettings = useStore((s) => s.updateSettings)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes del Pomodoro"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Ajustes del Pomodoro</h2>
          <IconButton onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="space-y-3">
          {FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-zinc-600 dark:text-zinc-300">{field.label}</span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={settings[field.key]}
                  onChange={(e) =>
                    updateSettings({
                      [field.key]: clamp(Number(e.target.value), field.min, field.max),
                    } as Partial<Settings>)
                  }
                  className="w-16 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-right tabular-nums focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                />
                <span className="w-16 text-xs text-zinc-400">{field.suffix}</span>
              </span>
            </label>
          ))}

          <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
            <span className="text-zinc-600 dark:text-zinc-300">
              Iniciar la fase siguiente automáticamente
            </span>
            <input
              type="checkbox"
              checked={settings.autoStart}
              onChange={(e) => updateSettings({ autoStart: e.target.checked })}
              className="h-4 w-4 shrink-0 accent-violet-600"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
