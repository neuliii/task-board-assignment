import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Task, Status } from '../types'
import { Card } from './Card'

interface Props {
  title: string
  status: Status
  tasks: Task[]
  onMove: (id: string, status: Status) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function Column({ title, status, tasks, onMove, onEdit, onDelete }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 74,
    overscan: 8,
  })

  return (
    <section
      className="column"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData('text/plain')
        if (id) onMove(id, status)
      }}
    >
      <h2 className="column-title">
        {title} <span className="count">{tasks.length}</span>
      </h2>
      <div ref={scrollRef} className="column-body">
        <div
          className="virtual-list"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const task = tasks[virtualRow.index]
            if (!task) return null

            return (
              <div
                key={task.id}
                ref={rowVirtualizer.measureElement}
                className="virtual-row"
                data-index={virtualRow.index}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <Card task={task} onEdit={onEdit} onDelete={onDelete} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
