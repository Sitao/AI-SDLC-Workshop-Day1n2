import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleRouteError, parseRequestJson, requireSession } from '@/lib/api'
import { tagDB } from '@/lib/db'

const tagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().trim().min(4).max(20).optional(),
})

export async function GET() {
  try {
    const session = await requireSession()
    return NextResponse.json({ tags: tagDB.listByUserId(session.userId) })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const payload = await parseRequestJson(request, tagSchema)
    const tag = tagDB.create({
      user_id: session.userId,
      name: payload.name,
      color: payload.color,
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}