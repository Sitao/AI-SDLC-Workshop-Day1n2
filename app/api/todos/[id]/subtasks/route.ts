import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, handleRouteError, notFound, parseRequestJson, requireSession } from '@/lib/api'
import { subtaskDB, todoDB } from '@/lib/db'

const createSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
})

function parseTodoId(rawId: string): number {
  const todoId = Number(rawId)

  if (!Number.isInteger(todoId) || todoId <= 0) {
    throw badRequest('Invalid todo id')
  }

  return todoId
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const todoId = parseTodoId(id)
    const todo = todoDB.findByIdForUser(todoId, session.userId)

    if (!todo) {
      throw notFound('Todo not found')
    }

    const payload = await parseRequestJson(request, createSubtaskSchema)
    const subtask = subtaskDB.create({
      todo_id: todoId,
      title: payload.title,
    })

    return NextResponse.json({ subtask }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}