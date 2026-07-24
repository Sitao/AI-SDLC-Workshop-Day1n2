import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleRouteError, parseRequestJson, requireSession } from '@/lib/api'
import { todoDB } from '@/lib/db'
import {
  coerceReminderMinutes,
  normalizeOptionalDueDate,
  prioritySchema,
  recurrencePatternSchema,
  reminderMinutesSchema,
  sortTodos,
  validateFutureDueDate,
  validateRecurringDueDate,
} from '@/lib/todo-utils'

const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  due_date: z.string().trim().min(1).max(32).nullable().optional(),
  priority: prioritySchema.optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: recurrencePatternSchema.nullable().optional(),
  reminder_minutes: reminderMinutesSchema.nullable().optional(),
})

export async function GET() {
  try {
    const session = await requireSession()
    return NextResponse.json({ todos: sortTodos(todoDB.listByUserId(session.userId)) })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const payload = await parseRequestJson(request, createTodoSchema)
    const normalizedDueDate = normalizeOptionalDueDate(payload.due_date) ?? null
    const dueDate = normalizedDueDate ? validateFutureDueDate(normalizedDueDate) : null
    const isRecurring = payload.is_recurring ?? false
    validateRecurringDueDate(isRecurring, dueDate)

    const todo = todoDB.create({
      user_id: session.userId,
      title: payload.title,
      due_date: dueDate,
      priority: payload.priority,
      is_recurring: isRecurring,
      recurrence_pattern: payload.recurrence_pattern ?? null,
      reminder_minutes: coerceReminderMinutes(payload.reminder_minutes) ?? null,
    })

    return NextResponse.json({ todo }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}