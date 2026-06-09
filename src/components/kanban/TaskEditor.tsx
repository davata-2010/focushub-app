import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Priority, Task } from '../../types'
import { useStore } from '../../store/useStore'
import { PrioritySelect } from './PrioritySelect'

interface TaskEditorProps {
  task: Task
  onClose: () => void
}

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800'

export function TaskEditor({ task, onClose }: TaskEditorProps) {
  const updateTask = useStore((s) => s.updateTask)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [tags, setTags] = useState(task.tags.join(', '))

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    updateTask(task.id, {
      title: trimmed,
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
    onClose()
  }

  const onTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="rounded-xl border border-violet-300 bg-white p-3 shadow-sm dark:border-violet-700/60 dark:bg-zinc-900">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onTitleKeyDown}
        placeholder="Título de la tarea"
        className={`${inputClass} font-medium`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={2}
        className={`${inputClass} mt-2 resize-none`}
      />
      <div className="mt-2.5">
        <PrioritySelect value={priority} onChange={setPriority} />
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClass}
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="etiquetas, por, comas"
          className={inputClass}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}
