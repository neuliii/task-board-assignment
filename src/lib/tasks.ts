import type { Priority, Task, Status } from '../types'

/**
 * 순수 함수 예시 — 이런 로직을 테스트로 검증하세요. (tasks.test.ts 참고)
 * 필요하면 자유롭게 수정/삭제해도 됩니다.
 */
export function moveTask(tasks: Task[], id: string, status: Status): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, status } : t))
}

export function filterByTitle(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase()
  if (!q) return tasks
  return tasks.filter((t) => t.title.toLowerCase().includes(q))
}

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export function sortByPriorityAndCreatedAt(tasks: Task[]): Task[] {
  return tasks.slice().sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (priorityDiff !== 0) return priorityDiff

    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}

export function rollbackCreatedTask(tasks: Task[], optimisticId: string): Task[] {
  return tasks.filter((task) => task.id !== optimisticId)
}

export function rollbackUpdatedTask(tasks: Task[], previousTask: Task): Task[] {
  return tasks.map((task) => (task.id === previousTask.id ? previousTask : task))
}

export function rollbackDeletedTask(
  tasks: Task[],
  previousTask: Task,
  previousIndex: number,
): Task[] {
  if (tasks.some((task) => task.id === previousTask.id)) return tasks

  const nextTasks = tasks.slice()
  const insertIndex = Math.min(Math.max(previousIndex, 0), nextTasks.length)
  nextTasks.splice(insertIndex, 0, previousTask)
  return nextTasks
}
