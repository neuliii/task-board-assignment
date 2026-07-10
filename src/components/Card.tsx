import type { Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

interface Props {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function Card({ task, onEdit, onDelete }: Props) {
  return (
    <article
      className={`card priority-${task.priority}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
    >
      <div className="card-header">
        <div className="card-title">{task.title}</div>
        <div className="card-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(task)
            }}
          >
            수정
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(task)
            }}
          >
            삭제
          </button>
        </div>
      </div>
      {task.description && <p className="card-description">{task.description}</p>}
      <div className="card-meta">
        <span className={`badge badge-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
        <span className="date">{new Date(task.createdAt).toLocaleDateString()}</span>
      </div>
    </article>
  )
}
