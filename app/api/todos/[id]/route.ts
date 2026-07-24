import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, handleRouteError, notFound, parseRequestJson, requireSession } from '@/lib/api'
import { todoDB, withTransaction } from '@/lib/db'
import {
  calculateNextDueDate,
  coerceReminderMinutes,
  normalizeOptionalDueDate,
  prioritySchema,
  recurrencePatternSchema,
  reminderMinutesSchema,
  validateFutureDueDate,
  validateRecurringDueDate,
} from '@/lib/todo-utils'

const updateTodoSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  due_date: z.string().trim().min(1).max(32).nullable().optional(),
  last_notification_sent: z.string().trim().min(1).nullable().optional(),
  priority: prioritySchema.optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: recurrencePatternSchema.nullable().optional(),
  reminder_minutes: reminderMinutesSchema.nullable().optional(),
})

function parseTodoId(rawId: string): number {
  const todoId = Number(rawId)

  if (!Number.isInteger(todoId) || todoId <= 0) {
    throw badRequest('Invalid todo id')
  }

  return todoId
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const todo = todoDB.findByIdForUser(parseTodoId(id), session.userId)

    if (!todo) {
      throw notFound('Todo not found')
    }

    return NextResponse.json({ todo })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const todoId = parseTodoId(id)
    const existingTodo = todoDB.findByIdForUser(todoId, session.userId)

    if (!existingTodo) {
      throw notFound('Todo not found')
    }

    const payload = await parseRequestJson(request, updateTodoSchema)
    const normalizedDueDate = normalizeOptionalDueDate(payload.due_date)
    const dueDate = normalizedDueDate === undefined
      ? undefined
      : normalizedDueDate === null
        ? null
        : validateFutureDueDate(normalizedDueDate)

    const nextRecurringValue = payload.is_recurring ?? existingTodo.is_recurring
    const nextDueDate = dueDate === undefined ? existingTodo.due_date : dueDate
    validateRecurringDueDate(nextRecurringValue, nextDueDate)

    const updatedTodo = withTransaction(() => {
      const currentTodo = todoDB.update(todoId, session.userId, {
        title: payload.title,
        completed: payload.completed,
        due_date: dueDate,
        priority: payload.priority,
        is_recurring: payload.is_recurring,
        recurrence_pattern: payload.recurrence_pattern,
        reminder_minutes: coerceReminderMinutes(payload.reminder_minutes),
        last_notification_sent: payload.last_notification_sent,
      })

      const shouldCreateNextRecurringTodo =
        payload.completed === true &&
        existingTodo.completed === false &&
        existingTodo.is_recurring &&
        Boolean(existingTodo.recurrence_pattern) &&
        Boolean(existingTodo.due_date)

      if (shouldCreateNextRecurringTodo && existingTodo.recurrence_pattern && existingTodo.due_date) {
        const recurringTodo = todoDB.create({
          user_id: session.userId,
          title: existingTodo.title,
          due_date: calculateNextDueDate(existingTodo.due_date, existingTodo.recurrence_pattern),
          priority: existingTodo.priority,
          is_recurring: true,
          recurrence_pattern: existingTodo.recurrence_pattern,
          reminder_minutes: coerceReminderMinutes(existingTodo.reminder_minutes),
        })

        for (const tag of existingTodo.tags ?? []) {
          todoDB.attachTag(recurringTodo.id, tag.id, session.userId)
        }
      }

      return currentTodo
    })

    return NextResponse.json({ todo: updatedTodo })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    todoDB.delete(parseTodoId(id), session.userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}