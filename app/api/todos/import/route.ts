import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, handleRouteError, parseRequestJson, requireSession } from '@/lib/api'
import { subtaskDB, tagDB, todoDB, withTransaction } from '@/lib/db'
import { normalizeSingaporeDateTime } from '@/lib/timezone'

const importedTagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().trim().min(4).max(20),
})

const importedSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  completed: z.boolean(),
  position: z.number().int().min(0),
  created_at: z.string().trim().min(1),
})

const importedTodoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  completed: z.boolean(),
  due_date: z.string().trim().min(1).nullable(),
  priority: z.enum(['high', 'medium', 'low']),
  is_recurring: z.boolean(),
  recurrence_pattern: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable(),
  reminder_minutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(60),
    z.literal(120),
    z.literal(1440),
    z.literal(2880),
    z.literal(10080),
  ]).nullable(),
  last_notification_sent: z.string().trim().min(1).nullable(),
  created_at: z.string().trim().min(1),
  updated_at: z.string().trim().min(1).nullable(),
  subtasks: z.array(importedSubtaskSchema),
  tags: z.array(importedTagSchema),
})

const importEnvelopeSchema = z.object({
  version: z.literal(1),
  exported_at: z.string().trim().min(1),
  todos: z.array(importedTodoSchema).max(500),
})

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const payload = await parseRequestJson(request, importEnvelopeSchema)

    const imported = withTransaction(() => {
      for (const todo of payload.todos) {
        if (todo.is_recurring && (!todo.due_date || !todo.recurrence_pattern)) {
          throw badRequest('Recurring imported todos require due_date and recurrence_pattern')
        }

        const createdTodo = todoDB.create({
          user_id: session.userId,
          title: todo.title,
          due_date: todo.due_date ? normalizeSingaporeDateTime(todo.due_date) : null,
          priority: todo.priority,
          is_recurring: todo.is_recurring,
          recurrence_pattern: todo.recurrence_pattern,
          reminder_minutes: todo.reminder_minutes,
        })

        todoDB.update(createdTodo.id, session.userId, {
          completed: todo.completed,
          created_at: todo.created_at,
          last_notification_sent: todo.last_notification_sent,
          updated_at: todo.updated_at,
        })

        for (const subtask of todo.subtasks) {
          const createdSubtask = subtaskDB.create({
            todo_id: createdTodo.id,
            title: subtask.title,
            position: subtask.position,
          })

          subtaskDB.update(createdSubtask.id, { created_at: subtask.created_at })

          if (subtask.completed) {
            subtaskDB.update(createdSubtask.id, { completed: true })
          }
        }

        for (const tag of todo.tags) {
          const existingTag = tagDB.findByName(session.userId, tag.name)
          const resolvedTag = existingTag ?? tagDB.create({
            user_id: session.userId,
            name: tag.name,
            color: tag.color,
          })

          todoDB.attachTag(createdTodo.id, resolvedTag.id, session.userId)
        }
      }

      return payload.todos.length
    })

    return NextResponse.json({ imported })
  } catch (error) {
    return handleRouteError(error)
  }
}