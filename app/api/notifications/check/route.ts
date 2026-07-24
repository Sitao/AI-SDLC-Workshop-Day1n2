import { NextResponse } from 'next/server'
import { handleRouteError, requireSession } from '@/lib/api'
import { todoDB } from '@/lib/db'

export async function GET() {
  try {
    const session = await requireSession()

    const notifications = todoDB.listNotificationCandidates(session.userId).map((candidate) => ({
      todoId: candidate.todoId,
      title: candidate.title,
      dueDate: candidate.dueDate,
    }))

    return NextResponse.json({ notifications })
  } catch (error) {
    return handleRouteError(error)
  }
}