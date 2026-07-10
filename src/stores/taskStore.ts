import { create } from 'zustand'
import type { Priority, Status, Task } from '../types'
import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  getTasks,
  updateTask,
} from '../api/client'

export interface TaskFormInput {
  title: string
  priority: Priority
  description?: string
}

interface TaskStore {
  tasks: Task[]
  loading: boolean
  loadError: string | null
  mutationError: string | null
  pendingMoveIds: Record<string, number>
  desiredMoveStatuses: Partial<Record<string, Status>>
  loadTasks: () => Promise<void>
  createTask: (input: TaskFormInput) => Promise<void>
  editTask: (id: string, input: TaskFormInput) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, status: Status) => Promise<void>
  clearMutationError: () => void
}

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback

const getTaskLabel = (task: Task) => task.title.match(/Task #\d+/)?.[0] ?? task.title

let nextMoveId = 0
let nextOptimisticId = 0
const movingTaskIds = new Set<string>()

const normalizeTaskInput = (input: TaskFormInput) => {
  const title = input.title.trim()
  const description = input.description?.trim()

  return {
    title,
    priority: input.priority,
    ...(description ? { description } : { description: undefined }),
  }
}

const makeOptimisticTask = (input: ReturnType<typeof normalizeTaskInput>): Task => {
  nextOptimisticId += 1
  const now = new Date().toISOString()

  return {
    id: `optimistic-task-${nextOptimisticId}`,
    title: input.title,
    description: input.description,
    status: 'todo',
    priority: input.priority,
    tags: [],
    createdAt: now,
    updatedAt: now,
    version: 0,
  }
}

const removePendingMove = (pendingMoveIds: Record<string, number>, id: string) => {
  const next = { ...pendingMoveIds }
  delete next[id]
  return next
}

const removeDesiredMove = (
  desiredMoveStatuses: Partial<Record<string, Status>>,
  id: string,
) => {
  const next = { ...desiredMoveStatuses }
  delete next[id]
  return next
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: true,
  loadError: null,
  mutationError: null,
  pendingMoveIds: {},
  desiredMoveStatuses: {},

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

  createTask: async (input) => {
    const normalizedInput = normalizeTaskInput(input)
    if (!normalizedInput.title) return

    const optimisticTask = makeOptimisticTask(normalizedInput)

    set((state) => ({
      tasks: [optimisticTask, ...state.tasks],
      mutationError: null,
    }))

    try {
      const createdTask = await createTaskRequest({
        ...normalizedInput,
        status: 'todo',
      })

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === optimisticTask.id ? createdTask : task,
        ),
      }))
    } catch (err) {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== optimisticTask.id),
        mutationError: '태스크 생성에 실패했습니다. 다시 시도해 주세요.',
      }))
    }
  },

  editTask: async (id, input) => {
    const normalizedInput = normalizeTaskInput(input)
    if (!normalizedInput.title) return

    const previousTask = get().tasks.find((task) => task.id === id)
    if (!previousTask) return

    const optimisticTask: Task = {
      ...previousTask,
      ...normalizedInput,
      updatedAt: new Date().toISOString(),
    }

    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? optimisticTask : task)),
      mutationError: null,
    }))

    try {
      const updatedTask = await updateTask(id, {
        ...normalizedInput,
        version: previousTask.version,
      })

      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      }))
    } catch (err) {
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? previousTask : task)),
        mutationError: `태스크 수정에 실패했습니다. 다시 시도해 주세요. ${getTaskLabel(
          previousTask,
        )}`,
      }))
    }
  },

  deleteTask: async (id) => {
    const tasks = get().tasks
    const previousIndex = tasks.findIndex((task) => task.id === id)
    if (previousIndex === -1) return

    const previousTask = tasks[previousIndex]

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      mutationError: null,
    }))

    try {
      await deleteTaskRequest(id)
    } catch (err) {
      set((state) => {
        if (state.tasks.some((task) => task.id === id)) {
          return {
            mutationError: `태스크 삭제에 실패했습니다. 다시 시도해 주세요. ${getTaskLabel(
              previousTask,
            )}`,
          }
        }

        const nextTasks = state.tasks.slice()
        nextTasks.splice(previousIndex, 0, previousTask)

        return {
          tasks: nextTasks,
          mutationError: `태스크 삭제에 실패했습니다. 다시 시도해 주세요. ${getTaskLabel(
            previousTask,
          )}`,
        }
      })
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
      desiredMoveStatuses: { ...state.desiredMoveStatuses, [id]: status },
    }))

    if (movingTaskIds.has(id)) return
    movingTaskIds.add(id)

    let confirmedTask = previousTask

    try {
      while (true) {
        const desiredStatus = get().desiredMoveStatuses[id]
        if (!desiredStatus || desiredStatus === confirmedTask.status) {
          set((state) => ({
            pendingMoveIds: removePendingMove(state.pendingMoveIds, id),
            desiredMoveStatuses: removeDesiredMove(state.desiredMoveStatuses, id),
          }))
          return
        }

        try {
          const updatedTask = await updateTask(id, {
            status: desiredStatus,
            version: confirmedTask.version,
          })
          confirmedTask = updatedTask

          set((state) => {
            const currentTask = state.tasks.find((task) => task.id === id)
            if (!currentTask) return state

            const latestDesiredStatus = state.desiredMoveStatuses[id]
            const isLatestSynced =
              !latestDesiredStatus || latestDesiredStatus === updatedTask.status
            const nextTask =
              isLatestSynced
                ? updatedTask
                : { ...updatedTask, status: latestDesiredStatus }

            return {
              tasks: state.tasks.map((task) => (task.id === id ? nextTask : task)),
              pendingMoveIds: isLatestSynced
                ? removePendingMove(state.pendingMoveIds, id)
                : state.pendingMoveIds,
              desiredMoveStatuses: isLatestSynced
                ? removeDesiredMove(state.desiredMoveStatuses, id)
                : state.desiredMoveStatuses,
            }
          })
        } catch (err) {
          set((state) => ({
            tasks: state.tasks.map((task) => (task.id === id ? confirmedTask : task)),
            mutationError: `태스크 이동에 실패했습니다. 다시 시도해 주세요. ${getTaskLabel(
              confirmedTask,
            )}`,
            pendingMoveIds: removePendingMove(state.pendingMoveIds, id),
            desiredMoveStatuses: removeDesiredMove(state.desiredMoveStatuses, id),
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
