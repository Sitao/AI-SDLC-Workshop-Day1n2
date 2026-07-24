'use client'

import { useEffect, useMemo, useState } from 'react'

type Priority = 'high' | 'medium' | 'low'
type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'
type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080

type Todo = {
  id: number
  title: string
  completed: boolean
  due_date: string | null
  priority: Priority
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  reminder_minutes?: ReminderMinutes | null
  created_at: string
}

type NotificationPermissionState = 'default' | 'granted' | 'denied'

type CreateTodoInput = {
  title: string
  due_date: string | null
  priority: Priority
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern | null
  reminder_minutes: ReminderMinutes | null
}

const priorityRank: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const reminderOptions: Array<{ value: ReminderMinutes; label: string }> = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 1440, label: '1d' },
  { value: 2880, label: '2d' },
  { value: 10080, label: '1w' },
]

function formatPriority(priority: Priority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

function formatRecurrence(pattern: RecurrencePattern | null | undefined): string {
  if (!pattern) {
    return ''
  }

  return pattern.charAt(0).toUpperCase() + pattern.slice(1)
}

function formatReminder(minutes: ReminderMinutes | null | undefined): string | null {
  if (!minutes) {
    return null
  }

  const option = reminderOptions.find((item) => item.value === minutes)
  return option ? `🔔 ${option.label}` : null
}

function sortPendingTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((leftTodo, rightTodo) => {
    const priorityDifference = priorityRank[leftTodo.priority] - priorityRank[rightTodo.priority]

    if (priorityDifference !== 0) {
      return priorityDifference
    }

    if (leftTodo.due_date && rightTodo.due_date && leftTodo.due_date !== rightTodo.due_date) {
      return leftTodo.due_date.localeCompare(rightTodo.due_date)
    }

    if (leftTodo.due_date && !rightTodo.due_date) {
      return -1
    }

    if (!leftTodo.due_date && rightTodo.due_date) {
      return 1
    }

    return rightTodo.created_at.localeCompare(leftTodo.created_at)
  })
}

async function fetchTodos(): Promise<Todo[]> {
  const response = await fetch('/api/todos', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as { todos?: Todo[] }
  return payload.todos ?? []
}

async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(input),
  })

  const payload = (await response.json().catch(() => ({}))) as { todo?: Todo; error?: string }

  if (!response.ok || !payload.todo) {
    throw new Error(payload.error ?? 'Failed to create todo')
  }

  return payload.todo
}

async function updateTodo(todoId: number, patch: Partial<Todo>): Promise<Todo> {
  const response = await fetch(`/api/todos/${todoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(patch),
  })

  const payload = (await response.json().catch(() => ({}))) as { todo?: Todo; error?: string }

  if (!response.ok || !payload.todo) {
    throw new Error(payload.error ?? 'Failed to update todo')
  }

  return payload.todo
}

async function deleteTodo(todoId: number): Promise<void> {
  const response = await fetch(`/api/todos/${todoId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? 'Failed to delete todo')
  }
}

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily')
  const [reminderMinutes, setReminderMinutes] = useState<ReminderMinutes | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }

    return 'default'
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isRepeatEnabled = Boolean(dueDate)

  useEffect(() => {
    void fetchTodos().then(setTodos)
  }, [])

  const filteredTodos = useMemo(() => {
    if (priorityFilter === 'all') {
      return todos
    }

    return todos.filter((todo) => todo.priority === priorityFilter)
  }, [todos, priorityFilter])

  const pendingTodos = useMemo(
    () => sortPendingTodos(filteredTodos.filter((todo) => !todo.completed)),
    [filteredTodos],
  )

  const completedTodos = useMemo(
    () => filteredTodos.filter((todo) => todo.completed),
    [filteredTodos],
  )

  async function handleAddTodo() {
    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      setErrorMessage('Title is required')
      return
    }

    setErrorMessage(null)

    try {
      const createdTodo = await createTodo({
        title: normalizedTitle,
        priority,
        due_date: dueDate || null,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        reminder_minutes: dueDate && reminderMinutes !== '' ? reminderMinutes : null,
      })

      setTodos((currentTodos) => [createdTodo, ...currentTodos])
      setTitle('')
      setPriority('medium')
      setDueDate('')
      setIsRecurring(false)
      setRecurrencePattern('daily')
      setReminderMinutes('')
    } catch (error) {
      const nextErrorMessage = error instanceof Error ? error.message : 'Failed to create todo'
      setErrorMessage(nextErrorMessage)
    }
  }

  async function handleToggleComplete(todo: Todo, completed: boolean) {
    const previousTodos = todos
    setTodos((currentTodos) =>
      currentTodos.map((item) => (item.id === todo.id ? { ...item, completed } : item)),
    )

    try {
      const updatedTodo = await updateTodo(todo.id, { completed })
      setTodos((currentTodos) =>
        currentTodos.map((item) => (item.id === todo.id ? { ...item, ...updatedTodo } : item)),
      )
    } catch (error) {
      setTodos(previousTodos)
      const nextErrorMessage = error instanceof Error ? error.message : 'Failed to update todo'
      setErrorMessage(nextErrorMessage)
    }
  }

  async function handleDeleteTodo(todoId: number) {
    try {
      await deleteTodo(todoId)
      setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== todoId))
    } catch (error) {
      const nextErrorMessage = error instanceof Error ? error.message : 'Failed to delete todo'
      setErrorMessage(nextErrorMessage)
    }
  }

  async function handleEnableNotifications() {
    if (!(typeof window !== 'undefined' && 'Notification' in window)) {
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-slate-900">Todo Dashboard</h1>
        <p className="text-sm text-slate-600">Manage priorities, recurring work, and reminders.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="todo-title" className="block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="todo-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-500"
              placeholder="Add a task"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="todo-priority" className="block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              id="todo-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-500"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="todo-due-date" className="block text-sm font-medium text-slate-700">
              Due date
            </label>
            <input
              id="todo-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => {
                const value = event.target.value
                setDueDate(value)

                if (!value) {
                  setIsRecurring(false)
                  setRecurrencePattern('daily')
                  setReminderMinutes('')
                }
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="todo-reminder" className="block text-sm font-medium text-slate-700">
              Reminder
            </label>
            <select
              id="todo-reminder"
              value={reminderMinutes === '' ? '' : String(reminderMinutes)}
              onChange={(event) => {
                const value = event.target.value
                setReminderMinutes(value === '' ? '' : (Number(value) as ReminderMinutes))
              }}
              disabled={!dueDate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">None</option>
              {reminderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
                disabled={!isRepeatEnabled}
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              Repeat
            </label>

            {!isRepeatEnabled ? (
              <p className="text-sm text-slate-500">Set a due date to enable repeat</p>
            ) : null}

            {isRecurring ? (
              <div className="max-w-xs space-y-2">
                <label htmlFor="todo-recurrence-pattern" className="block text-sm font-medium text-slate-700">
                  Recurrence pattern
                </label>
                <select
                  id="todo-recurrence-pattern"
                  value={recurrencePattern}
                  onChange={(event) => setRecurrencePattern(event.target.value as RecurrencePattern)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAddTodo}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Add Todo
          </button>

          {notificationPermission === 'granted' ? (
            <button
              type="button"
              disabled
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"
            >
              🔔 Notifications On
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              🔔 Enable Notifications
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Todos</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="priority-filter" className="text-sm font-medium text-slate-700">
              Filter by priority
            </label>
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {todos.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No todos yet</p>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Pending ({pendingTodos.length})</h3>
            <ul data-testid="pending-list" className="mt-3 space-y-3">
              {pendingTodos.map((todo) => (
                <li key={todo.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{todo.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          data-testid={`priority-badge-${todo.priority}`}
                          className="rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800"
                        >
                          {formatPriority(todo.priority)}
                        </span>

                        {todo.is_recurring && todo.recurrence_pattern ? (
                          <span
                            data-testid="recurring-badge"
                            className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700"
                          >
                            {formatRecurrence(todo.recurrence_pattern)}
                          </span>
                        ) : null}

                        {formatReminder(todo.reminder_minutes) ? (
                          <span
                            data-testid="reminder-badge"
                            className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
                          >
                            {formatReminder(todo.reminder_minutes)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id={`todo-complete-${todo.id}`}
                        type="checkbox"
                        aria-label={`Mark ${todo.title} complete`}
                        checked={todo.completed}
                        onChange={(event) => handleToggleComplete(todo, event.target.checked)}
                        className="h-4 w-4"
                      />
                      <button
                        type="button"
                        aria-label={`Delete ${todo.title}`}
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">Completed ({completedTodos.length})</h3>
            <ul className="mt-3 space-y-3">
              {completedTodos.map((todo) => (
                <li key={todo.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500 line-through">{todo.title}</p>

                    <div className="flex items-center gap-2">
                      <input
                        id={`todo-complete-finished-${todo.id}`}
                        type="checkbox"
                        aria-label={`Mark ${todo.title} complete`}
                        checked={todo.completed}
                        onChange={(event) => handleToggleComplete(todo, event.target.checked)}
                        className="h-4 w-4"
                      />
                      <button
                        type="button"
                        aria-label={`Delete ${todo.title}`}
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
