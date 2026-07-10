import { describe, it, expect } from 'vitest'
import {
  filterByTitle,
  moveTask,
  rollbackCreatedTask,
  rollbackDeletedTask,
  rollbackUpdatedTask,
  sortByPriorityAndCreatedAt,
} from './tasks'
import type { Task } from '../types'

const make = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  status: 'todo',
  priority: 'medium',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  ...over,
})

describe('moveTask', () => {
  it('대상 태스크의 status 만 바꾸고 나머지는 그대로 둔다', () => {
    const tasks = [make('a'), make('b')]
    const next = moveTask(tasks, 'a', 'done')
    expect(next.find((t) => t.id === 'a')?.status).toBe('done')
    expect(next.find((t) => t.id === 'b')?.status).toBe('todo')
  })

  it('불변성을 지킨다 (원본 배열/객체를 변경하지 않는다)', () => {
    const tasks = [make('a')]
    const next = moveTask(tasks, 'a', 'done')
    expect(tasks[0].status).toBe('todo')
    expect(next).not.toBe(tasks)
  })
})

describe('filterByTitle', () => {
  it('대소문자 구분 없이 제목으로 필터링한다', () => {
    const tasks = [make('a', { title: 'Fix login bug' }), make('b', { title: 'Write docs' })]
    expect(filterByTitle(tasks, 'FIX')).toHaveLength(1)
  })

  it('빈 검색어면 전체를 반환한다', () => {
    const tasks = [make('a'), make('b')]
    expect(filterByTitle(tasks, '   ')).toHaveLength(2)
  })

  it('앞뒤 공백을 제거한 검색어로 필터링한다', () => {
    const tasks = [make('a', { title: 'Design task dialog' }), make('b', { title: 'Write docs' })]
    expect(filterByTitle(tasks, ' dialog ')).toEqual([tasks[0]])
  })
})

describe('sortByPriorityAndCreatedAt', () => {
  it('우선순위를 high, medium, low 순서로 정렬한다', () => {
    const tasks = [
      make('low', { priority: 'low' }),
      make('high', { priority: 'high' }),
      make('medium', { priority: 'medium' }),
    ]

    expect(sortByPriorityAndCreatedAt(tasks).map((task) => task.id)).toEqual([
      'high',
      'medium',
      'low',
    ])
  })

  it('같은 우선순위에서는 최신 생성일이 먼저 온다', () => {
    const tasks = [
      make('old', {
        priority: 'high',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      make('new', {
        priority: 'high',
        createdAt: '2026-02-01T00:00:00.000Z',
      }),
    ]

    expect(sortByPriorityAndCreatedAt(tasks).map((task) => task.id)).toEqual([
      'new',
      'old',
    ])
  })

  it('원본 배열을 변경하지 않는다', () => {
    const tasks = [make('low', { priority: 'low' }), make('high', { priority: 'high' })]

    sortByPriorityAndCreatedAt(tasks)

    expect(tasks.map((task) => task.id)).toEqual(['low', 'high'])
  })
})

describe('rollback helpers', () => {
  it('생성 실패 시 optimistic task 를 제거한다', () => {
    const tasks = [make('optimistic'), make('server')]

    expect(rollbackCreatedTask(tasks, 'optimistic')).toEqual([tasks[1]])
  })

  it('수정 실패 시 이전 task snapshot 으로 복원한다', () => {
    const previousTask = make('a', { title: 'Before', priority: 'medium' })
    const tasks = [make('a', { title: 'After', priority: 'high' }), make('b')]

    expect(rollbackUpdatedTask(tasks, previousTask)).toEqual([previousTask, tasks[1]])
  })

  it('삭제 실패 시 이전 위치에 task 를 복원한다', () => {
    const previousTask = make('b')
    const tasks = [make('a'), make('c')]

    expect(rollbackDeletedTask(tasks, previousTask, 1).map((task) => task.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('삭제 롤백 대상이 이미 있으면 중복 삽입하지 않는다', () => {
    const previousTask = make('b')
    const tasks = [make('a'), previousTask, make('c')]

    expect(rollbackDeletedTask(tasks, previousTask, 1)).toBe(tasks)
  })
})
