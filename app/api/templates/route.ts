import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleRouteError, parseRequestJson, requireSession } from '@/lib/api'
import { templateDB } from '@/lib/db'
import { validateSubtasksJson } from '@/lib/template-utils'
import { prioritySchema, recurrencePatternSchema, reminderMinutesSchema } from '@/lib/todo-utils'

const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  title_template: z.string().trim().min(1).max(200),
  priority: prioritySchema.optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: recurrencePatternSchema.nullable().optional(),
  reminder_minutes: reminderMinutesSchema.nullable().optional(),
  due_date_offset_minutes: z.number().int().nullable().optional(),
  subtasks_json: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const session = await requireSession()
    return NextResponse.json({ templates: templateDB.listByUserId(session.userId) })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const payload = await parseRequestJson(request, templateSchema)
    const template = templateDB.create({
      user_id: session.userId,
      name: payload.name,
      description: payload.description ?? null,
      category: payload.category ?? null,
      title_template: payload.title_template,
      priority: payload.priority,
      is_recurring: payload.is_recurring ?? false,
      recurrence_pattern: payload.recurrence_pattern ?? null,
      reminder_minutes: payload.reminder_minutes ?? null,
      due_date_offset_minutes: payload.due_date_offset_minutes ?? null,
      subtasks_json: validateSubtasksJson(payload.subtasks_json) ?? null,
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}