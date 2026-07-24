import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, handleRouteError, notFound, parseRequestJson, requireSession } from '@/lib/api'
import { tagDB } from '@/lib/db'

const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z.string().trim().min(4).max(20).optional(),
})

function parseTagId(rawId: string): number {
  const tagId = Number(rawId)

  if (!Number.isInteger(tagId) || tagId <= 0) {
    throw badRequest('Invalid tag id')
  }

  return tagId
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const tagId = parseTagId(id)

    if (!tagDB.findByIdForUser(tagId, session.userId)) {
      throw notFound('Tag not found')
    }

    const payload = await parseRequestJson(request, updateTagSchema)
    const tag = tagDB.update(tagId, session.userId, payload)

    return NextResponse.json({ tag })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const tagId = parseTagId(id)

    if (!tagDB.findByIdForUser(tagId, session.userId)) {
      throw notFound('Tag not found')
    }

    tagDB.delete(tagId, session.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}