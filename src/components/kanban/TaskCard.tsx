import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '../../types'
import { useStore } from '../../store/useStore'
import { formatDueDate, isOverdue } from '../../lib/date'
import { PRIORITY_META } from './kanban-ui'
import { TaskEditor } from './TaskEditor'

interface TaskCardViewProps {
  task: Task
  setNodeRef?: (el: HTMLElement | null) => void
  style?: CSSProperties
  /** Drag handle (with listeners). When omitted a static grip is shown. */
  handle?: ReactNode
  dragging?: boolean
  overlay?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

/** Presentational card — shared by the sortable card and the drag overlay. */
export function TaskCardView({
  task,
  setNodeRef,
  style,
  handle,
  dragging = false,
  overlay = false,
  onEdit,
  onDelete,
}: TaskCardViewProps) {
  const meta = PRIORITY_META[task.priority]
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex gap-1.5 rounded-xl border bg-white p-3 pl-3.5 transition-shadow dark:bg-zinc-900 ${
        overlay
          ? 'rotate-2 border-violet-300 shadow-lg dark:border-violet-700'
          : 'border-zinc-200 shadow-sm hover:shadow-md dark:border-zinc-800'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <span className={`absolute inset-y-2 left-0 w-1 rounded-full ${meta.bar}`} />

      {handle ?? (
        <span className="mt-0.5 grid h-6 w-5 shrink-0 place-items-center text-zinc-300 dark:text-zinc-600">
          <GripVertical className="h-4 w-4" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium text-zinc-800 dark:text-zinc-100">
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
            {task.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${meta.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${
                overdue
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.dueDate)}
            </span>
          )}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {!overlay && (
        <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar tarea"
            className="grid h-6 w-6 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar tarea"
            className="grid h-6 w-6 place-items-center rounded text-zinc-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

/** Sortable, interactive task card used inside the columns. */
export function TaskCard({ task }: { task: Task }) {
  const deleteTask = useStore((s) => s.deleteTask)
  const [editing, setEditing] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: editing })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  if (editing) {
    return (
      <div ref={setNodeRef} style={style}>
        <TaskEditor task={task} onClose={() => setEditing(false)} />
      </div>
    )
  }

  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      aria-label="Arrastrar tarea"
      className="mt-0.5 grid h-6 w-5 shrink-0 cursor-grab touch-none place-items-center text-zinc-300 hover:text-zinc-500 active:cursor-grabbing dark:text-zinc-600 dark:hover:text-zinc-400"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )

  return (
    <TaskCardView
      task={task}
      setNodeRef={setNodeRef}
      style={style}
      handle={handle}
      dragging={isDragging}
      onEdit={() => setEditing(true)}
      onDelete={() => deleteTask(task.id)}
    />
  )
}
