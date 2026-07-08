import { create } from 'zustand'
import type { Status, Task } from '../types'
import { getTasks, updateTask } from '../api/client'

interface TaskStore {
  tasks: Task[]
  loading: boolean
  loadError: string | null
  mutationError: string | null
  pendingMoveIds: Record<string, number>
  loadTasks: () => Promise<void>
  moveTask: (id: string, status: Status) => Promise<void>
  clearMutationError: () => void
}

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback

const getTaskLabel = (task: Task) => task.title.match(/Task #\d+/)?.[0] ?? task.title

let nextMoveId = 0
const movingTaskIds = new Set<string>()

const removePendingMove = (pendingMoveIds: Record<string, number>, id: string) => {
  const next = { ...pendingMoveIds }
  delete next[id]
  return next
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: true,
  loadError: null,
  mutationError: null,
  pendingMoveIds: {},

  loadTasks: async () => {
    set({ loading: true, loadError: null })

    try {
      const tasks = await getTasks()
      set({ tasks })
    } catch (err) {
      set({ loadError: getErrorMessage(err, '태스크를 불러오지 못했습니다.') })
    } finally {
      set({ loading: false })
    }
  },

  moveTask: async (id, status) => {
    const previousTask = get().tasks.find((task) => task.id === id)
    if (!previousTask || previousTask.status === status) return

    const moveId = nextMoveId + 1
    nextMoveId = moveId

    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, status } : task)),
      mutationError: null,
      pendingMoveIds: { ...state.pendingMoveIds, [id]: moveId },
    }))

    if (movingTaskIds.has(id)) return
    movingTaskIds.add(id)

    let confirmedTask = previousTask

    try {
      while (true) {
        const desiredTask = get().tasks.find((task) => task.id === id)
        if (!desiredTask || desiredTask.status === confirmedTask.status) {
          set((state) => ({
            pendingMoveIds: removePendingMove(state.pendingMoveIds, id),
          }))
          return
        }

        try {
          const updatedTask = await updateTask(id, {
            status: desiredTask.status,
            version: confirmedTask.version,
          })
          confirmedTask = updatedTask

          set((state) => {
            const currentTask = state.tasks.find((task) => task.id === id)
            if (!currentTask) return state

            const nextTask =
              currentTask.status === updatedTask.status
                ? updatedTask
                : { ...updatedTask, status: currentTask.status }

            return {
              tasks: state.tasks.map((task) => (task.id === id ? nextTask : task)),
              pendingMoveIds:
                nextTask.status === updatedTask.status
                  ? removePendingMove(state.pendingMoveIds, id)
                  : state.pendingMoveIds,
            }
          })
        } catch (err) {
          set((state) => ({
            tasks: state.tasks.map((task) => (task.id === id ? confirmedTask : task)),
            mutationError: `태스크 이동에 실패했습니다. 다시 시도해 주세요. ${getTaskLabel(
              confirmedTask,
            )}`,
            pendingMoveIds: removePendingMove(state.pendingMoveIds, id),
          }))
          return
        }
      }
    } finally {
      movingTaskIds.delete(id)
    }
  },

  clearMutationError: () => set({ mutationError: null }),
}))
