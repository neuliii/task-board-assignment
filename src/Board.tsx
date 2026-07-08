import { useEffect, useMemo } from 'react'
import type { Status, Task } from './types'
import { Column } from './components/Column'
import { useTaskStore } from './stores/taskStore'

const COLUMNS: { status: Status; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in-progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
]

export default function Board() {
  const tasks = useTaskStore((state) => state.tasks)
  const loading = useTaskStore((state) => state.loading)
  const loadError = useTaskStore((state) => state.loadError)
  const mutationError = useTaskStore((state) => state.mutationError)
  const loadTasks = useTaskStore((state) => state.loadTasks)
  const moveTask = useTaskStore((state) => state.moveTask)
  const clearMutationError = useTaskStore((state) => state.clearMutationError)

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const byStatus = useMemo(() => {
    const map: Record<Status, Task[]> = { todo: [], 'in-progress': [], done: [] }
    for (const t of tasks) map[t.status].push(t)
    return map
  }, [tasks])

  if (loading) return <p className="hint">불러오는 중…</p>

  if (loadError) {
    return (
      <div className="state-message" role="alert">
        <p>{loadError}</p>
        <button type="button" onClick={loadTasks}>
          다시 시도
        </button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return <p className="state-message">표시할 태스크가 없습니다.</p>
  }

  return (
    <>
      {mutationError && (
        <div className="mutation-alert" role="alert">
          <span>{mutationError}</span>
          <button type="button" onClick={clearMutationError}>
            닫기
          </button>
        </div>
      )}
      <div className="board">
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            title={col.title}
            status={col.status}
            tasks={byStatus[col.status]}
            onMove={moveTask}
          />
        ))}
      </div>
    </>
  )
}
