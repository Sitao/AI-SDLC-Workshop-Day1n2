import { z } from 'zod'
import type { Priority, RecurrencePattern, ReminderMinutes, Todo } from '@/lib/db'
import {
  addDaysSingapore,
  addMonthsSingapore,
  addYearsSingapore,
  getSingaporeNow,
  normalizeSingaporeDateTime,
  parseSingaporeDateTime,
  toSingaporeISOString,
} from '@/lib/timezone'
import { badRequest } from '@/lib/api'

export const prioritySchema = z.enum(['high', 'medium', 'low'])
export const recurrencePatternSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly'])
export const reminderMinutesSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
  z.literal(120),
  z.literal(1440),
  z.literal(2880),
  z.literal(10080),
])

const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export function normalizeOptionalDueDate(dueDate: string | null | undefined): string | null | undefined {
  if (dueDate === undefined) {
    return undefined
  }

  if (dueDate === null) {
    return null
  }

  return normalizeSingaporeDateTime(dueDate)
}

export function validateFutureDueDate(dueDate: string): string {
  const normalizedDueDate = normalizeSingaporeDateTime(dueDate)
  const minimumAllowedTime = getSingaporeNow().getTime() + 60 * 1000

  if (parseSingaporeDateTime(normalizedDueDate).getTime() < minimumAllowedTime) {
    throw badRequest('Due date must be at least 1 minute in the future')
  }

  return normalizedDueDate
}

export function validateRecurringDueDate(isRecurring: boolean, dueDate: string | null): void {
  if (isRecurring && !dueDate) {
    throw badRequest('Recurring todos require a due date')
  }
}

export function calculateNextDueDate(currentDueDate: string, recurrencePattern: RecurrencePattern): string {
  switch (recurrencePattern) {
    case 'daily':
      return addDaysSingapore(currentDueDate, 1)
    case 'weekly':
      return addDaysSingapore(currentDueDate, 7)
    case 'monthly':
      return addMonthsSingapore(currentDueDate, 1)
    case 'yearly':
      return addYearsSingapore(currentDueDate, 1)
  }
}

function getTodoSectionRank(todo: Todo, nowIso: string): number {
  if (todo.completed) {
    return 2
  }

  if (todo.due_date && todo.due_date < nowIso) {
    return 0
  }

  return 1
}

export function sortTodos(todos: Todo[]): Todo[] {
  const nowIso = toSingaporeISOString(getSingaporeNow())

  return [...todos].sort((leftTodo, rightTodo) => {
    const sectionRankDifference = getTodoSectionRank(leftTodo, nowIso) - getTodoSectionRank(rightTodo, nowIso)

    if (sectionRankDifference !== 0) {
      return sectionRankDifference
    }

    if (!leftTodo.completed && !rightTodo.completed) {
      const priorityDifference = priorityOrder[leftTodo.priority] - priorityOrder[rightTodo.priority]

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
    }

    return rightTodo.created_at.localeCompare(leftTodo.created_at)
  })
}

export function coerceReminderMinutes(reminderMinutes: number | null | undefined): ReminderMinutes | null | undefined {
  if (reminderMinutes === undefined || reminderMinutes === null) {
    return reminderMinutes
  }

  return reminderMinutesSchema.parse(reminderMinutes)
}