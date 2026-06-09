import { useMemo, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Status, Task } from '../../types'
import { COLUMNS } from '../../types'
import { useStore } from '../../store/useStore'
import { KanbanColumn } from './KanbanColumn'
import { TaskCardView } from './TaskCard'

const STATUSES: Status[] = ['todo', 'in-progress', 'done']

function isStatus(id: string): id is Status {
  return (STATUSES as string[]).includes(id)
}

export function KanbanBoard() {
  const tasks = useStore((s) => s.tasks)
  const moveTask = useStore((s) => s.moveTask)
  const reorderTasks = useStore((s) => s.reorderTasks)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const tasksByStatus = useMemo(() => {
    const map: Record<Status, Task[]> = { todo: [], 'in-progress': [], done: [] }
    for (const task of tasks) map[task.status].push(task)
    return map
  }, [tasks])

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null

  /** Resolve which column a draggable/droppable id belongs to. */
  const findContainer = (id: string): Status | null => {
    if (isStatus(id)) return id
    const task = tasks.find((t) => t.id === id)
    return task ? task.status : null
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  // Live cross-column movement while dragging — updates global state instantly.
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeContainer = findContainer(activeId)
    const overContainer = findContainer(overId)
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return
    }
    moveTask(activeId, overContainer, isStatus(overId) ? undefined : overId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return
    const activeContainer = findContainer(activeId)
    const overContainer = findContainer(overId)
    if (!activeContainer || !overContainer) return
    // Reorder within the same column (ignore drops on the column itself).
    if (activeContainer === overContainer && !isStatus(overId)) {
      reorderTasks(activeId, overId)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id]}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCardView task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
