import { NextResponse } from 'next/server'
import { handleRouteError, requireSession } from '@/lib/api'

export async function GET() {
  try {
    const session = await requireSession()

    return NextResponse.json({
      user: {
        id: session.userId,
        username: session.username,
      },
    })
  } catch (error) {
    return handleRouteError(error)
  }
}