import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Priority, Status, Task } from './types'
import { Column } from './components/Column'
import { TaskFormInput, useTaskStore } from './stores/taskStore'

const COLUMNS: { status: Status; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in-progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
]

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const EMPTY_FORM: TaskFormInput = {
  title: '',
  priority: 'medium',
  description: '',
}

type DialogMode = 'create' | 'edit' | null

export default function Board() {
  const [form, setForm] = useState<TaskFormInput>(EMPTY_FORM)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [createScrollSignal, setCreateScrollSignal] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const tasks = useTaskStore((state) => state.tasks)
  const loading = useTaskStore((state) => state.loading)
  const loadError = useTaskStore((state) => state.loadError)
  const mutationError = useTaskStore((state) => state.mutationError)
  const loadTasks = useTaskStore((state) => state.loadTasks)
  const createTask = useTaskStore((state) => state.createTask)
  const editTask = useTaskStore((state) => state.editTask)
  const deleteTask = useTaskStore((state) => state.deleteTask)
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

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingTaskId(null)
    setDialogMode(null)
  }

  const handleCreateStart = () => {
    setForm(EMPTY_FORM)
    setEditingTaskId(null)
    setDialogMode('create')
  }

  const handleEditStart = (task: Task) => {
    setEditingTaskId(task.id)
    setForm({
      title: task.title,
      priority: task.priority,
      description: task.description ?? '',
    })
    setDialogMode('edit')
  }

  const handleDelete = (task: Task) => {
    if (window.confirm(`"${task.title}" 태스크를 삭제할까요?`)) {
      void deleteTask(task.id)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) return

    setSubmitting(true)
    try {
      if (dialogMode === 'edit' && editingTaskId) {
        await editTask(editingTaskId, form)
      } else {
        const createRequest = createTask(form)
        setCreateScrollSignal((signal) => signal + 1)
        await createRequest
      }
      resetForm()
    } finally {
      setSubmitting(false)
    }
  }

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

  return (
    <>
      <div className="board-toolbar">
        <button type="button" onClick={handleCreateStart}>
          추가
        </button>
      </div>
      {dialogMode && (
        <div className="dialog-backdrop" onClick={resetForm}>
          <section
            className="task-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-header">
              <h2 id="task-dialog-title">
                {dialogMode === 'edit' ? '태스크 수정' : '태스크 추가'}
              </h2>
              <button
                type="button"
                className="dialog-close"
                aria-label="닫기"
                onClick={resetForm}
              >
                ×
              </button>
            </div>
            <form className="task-form" onSubmit={handleSubmit}>
              <div className="task-form-row">
                <label>
                  <span>Title</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))}
                    required
                  />
                </label>
                <label>
                  <span>Priority</span>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value as Priority,
                      }))
                    }
                    required
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))}
                  rows={3}
                />
              </label>
              <div className="task-form-actions">
                <button type="submit" disabled={submitting || !form.title.trim()}>
                  {dialogMode === 'edit' ? '수정' : '추가'}
                </button>
                <button type="button" onClick={resetForm}>
                  취소
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
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
            onEdit={handleEditStart}
            onDelete={handleDelete}
            scrollToTopSignal={col.status === 'todo' ? createScrollSignal : 0}
          />
        ))}
      </div>
      {tasks.length === 0 && <p className="state-message">표시할 태스크가 없습니다.</p>}
    </>
  )
}
