import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, handleRouteError, notFound, parseRequestJson, requireSession } from '@/lib/api'
import { tagDB, todoDB } from '@/lib/db'

const todoTagSchema = z.object({
  tagId: z.number().int().positive(),
})

function parseTodoId(rawId: string): number {
  const todoId = Number(rawId)

  if (!Number.isInteger(todoId) || todoId <= 0) {
    throw badRequest('Invalid todo id')
  }

  return todoId
}

async function resolveTodoAndTag(rawTodoId: string, request: Request, userId: number) {
  const todoId = parseTodoId(rawTodoId)
  const payload = await parseRequestJson(request, todoTagSchema)

  if (!todoDB.findByIdForUser(todoId, userId)) {
    throw notFound('Todo not found')
  }

  if (!tagDB.findByIdForUser(payload.tagId, userId)) {
    throw notFound('Tag not found')
  }

  return { todoId, tagId: payload.tagId }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const { todoId, tagId } = await resolveTodoAndTag(id, request, session.userId)

    todoDB.attachTag(todoId, tagId, session.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const { todoId, tagId } = await resolveTodoAndTag(id, request, session.userId)

    todoDB.detachTag(todoId, tagId, session.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}