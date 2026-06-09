import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ColumnDef, Task } from '../../types'
import { TaskCard } from './TaskCard'
import { AddTaskForm } from './AddTaskForm'
import { STATUS_ACCENT } from './kanban-ui'

interface KanbanColumnProps {
  column: ColumnDef
  tasks: Task[]
}

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section className="flex min-w-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_ACCENT[column.id]}`} />
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {column.title}
        </h2>
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-zinc-200 px-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-2xl border p-2 transition-colors ${
          isOver
            ? 'border-violet-400 bg-violet-500/5 dark:border-violet-600'
            : 'border-zinc-200/70 bg-zinc-100/50 dark:border-zinc-800/70 dark:bg-zinc-900/40'
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
            Arrastra tareas aquí
          </p>
        )}

        <AddTaskForm status={column.id} />
      </div>
    </section>
  )
}
