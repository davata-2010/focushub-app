import type { Priority } from '../../types'
import { PRIORITY_ORDER } from '../../types'
import { PRIORITY_META } from './kanban-ui'

interface PrioritySelectProps {
  value: Priority
  onChange: (priority: Priority) => void
}

export function PrioritySelect({ value, onChange }: PrioritySelectProps) {
  return (
    <div className="flex gap-1">
      {PRIORITY_ORDER.map((priority) => {
        const meta = PRIORITY_META[priority]
        const active = priority === value
        return (
          <button
            key={priority}
            type="button"
            onClick={() => onChange(priority)}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? `border-transparent ${meta.badge}`
                : 'border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
