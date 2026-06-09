import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import type { Priority, Status } from '../../types'
import { useStore } from '../../store/useStore'
import { PrioritySelect } from './PrioritySelect'

interface AddTaskFormProps {
  status: Status
}

export function AddTaskForm({ status }: AddTaskFormProps) {
  const addTask = useStore((s) => s.addTask)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  const submit = () => {
    if (!title.trim()) return
    addTask({ title, status, priority })
    setTitle('')
    setPriority('medium')
  }

  const close = () => {
    setOpen(false)
    setTitle('')
    setPriority('medium')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      close()
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
      >
        <Plus className="h-4 w-4" />
        Añadir tarea
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Nueva tarea…"
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <PrioritySelect value={priority} onChange={setPriority} />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={close}
            className="rounded-lg px-2.5 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  )
}
