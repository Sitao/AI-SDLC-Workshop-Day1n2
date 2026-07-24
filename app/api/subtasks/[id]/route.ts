import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, handleRouteError, notFound, parseRequestJson, requireSession } from '@/lib/api'
import { subtaskDB } from '@/lib/db'

const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
})

function parseSubtaskId(rawId: string): number {
  const subtaskId = Number(rawId)

  if (!Number.isInteger(subtaskId) || subtaskId <= 0) {
    throw badRequest('Invalid subtask id')
  }

  return subtaskId
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const subtaskId = parseSubtaskId(id)

    if (!subtaskDB.findByIdForUser(subtaskId, session.userId)) {
      throw notFound('Subtask not found')
    }

    const payload = await parseRequestJson(request, updateSubtaskSchema)
    const subtask = subtaskDB.update(subtaskId, payload)

    return NextResponse.json({ subtask })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const subtaskId = parseSubtaskId(id)

    if (!subtaskDB.findByIdForUser(subtaskId, session.userId)) {
      throw notFound('Subtask not found')
    }

    subtaskDB.delete(subtaskId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}