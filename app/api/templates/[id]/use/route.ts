import { NextResponse } from 'next/server'
import { badRequest, handleRouteError, notFound, requireSession } from '@/lib/api'
import { subtaskDB, templateDB, todoDB, withTransaction } from '@/lib/db'
import { parseTemplateSubtasksJson } from '@/lib/template-utils'
import { coerceReminderMinutes } from '@/lib/todo-utils'
import { addMinutesSingapore, getSingaporeNow, toSingaporeISOString } from '@/lib/timezone'

function parseTemplateId(rawId: string): number {
  const templateId = Number(rawId)

  if (!Number.isInteger(templateId) || templateId <= 0) {
    throw badRequest('Invalid template id')
  }

  return templateId
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const template = templateDB.findByIdForUser(parseTemplateId(id), session.userId)

    if (!template) {
      throw notFound('Template not found')
    }

    const todo = withTransaction(() => {
      const dueDate = template.due_date_offset_minutes == null
        ? null
        : addMinutesSingapore(toSingaporeISOString(getSingaporeNow()), template.due_date_offset_minutes)

      const createdTodo = todoDB.create({
        user_id: session.userId,
        title: template.title_template,
        due_date: dueDate,
        priority: template.priority,
        is_recurring: template.is_recurring,
        recurrence_pattern: template.recurrence_pattern,
        reminder_minutes: coerceReminderMinutes(template.reminder_minutes),
      })

      const subtasks = parseTemplateSubtasksJson(template.subtasks_json)

      for (const subtask of subtasks) {
        subtaskDB.create({
          todo_id: createdTodo.id,
          title: subtask.title,
          position: subtask.position,
        })
      }

      return todoDB.findByIdForUser(createdTodo.id, session.userId) ?? createdTodo
    })

    return NextResponse.json({ todo }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}