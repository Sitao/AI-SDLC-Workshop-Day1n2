import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, handleRouteError, notFound, parseRequestJson, requireSession } from '@/lib/api'
import { templateDB } from '@/lib/db'
import { validateSubtasksJson } from '@/lib/template-utils'
import { prioritySchema, recurrencePatternSchema, reminderMinutesSchema } from '@/lib/todo-utils'

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  title_template: z.string().trim().min(1).max(200).optional(),
  priority: prioritySchema.optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: recurrencePatternSchema.nullable().optional(),
  reminder_minutes: reminderMinutesSchema.nullable().optional(),
  due_date_offset_minutes: z.number().int().nullable().optional(),
  subtasks_json: z.string().nullable().optional(),
})

function parseTemplateId(rawId: string): number {
  const templateId = Number(rawId)

  if (!Number.isInteger(templateId) || templateId <= 0) {
    throw badRequest('Invalid template id')
  }

  return templateId
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const templateId = parseTemplateId(id)

    if (!templateDB.findByIdForUser(templateId, session.userId)) {
      throw notFound('Template not found')
    }

    const payload = await parseRequestJson(request, updateTemplateSchema)
    const template = templateDB.update(templateId, session.userId, {
      ...payload,
      subtasks_json: validateSubtasksJson(payload.subtasks_json),
    })

    return NextResponse.json({ template })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const templateId = parseTemplateId(id)

    if (!templateDB.findByIdForUser(templateId, session.userId)) {
      throw notFound('Template not found')
    }

    templateDB.delete(templateId, session.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}