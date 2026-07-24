import { NextResponse } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { getSession } from '@/lib/auth'
import type { Session } from '@/lib/db'

type ErrorDetails = Record<string, string | string[]>

export class RouteError extends Error {
  status: number
  details?: ErrorDetails

  constructor(status: number, message: string, details?: ErrorDetails) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function badRequest(message: string, details?: ErrorDetails): RouteError {
  return new RouteError(400, message, details)
}

export function unauthorized(): RouteError {
  return new RouteError(401, 'Not authenticated')
}

export function notFound(message = 'Not found'): RouteError {
  return new RouteError(404, message)
}

export function conflict(message: string): RouteError {
  return new RouteError(409, message)
}

export function internalServerError(): NextResponse {
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof RouteError) {
    const body = error.details ? { error: error.message, details: error.details } : { error: error.message }
    return NextResponse.json(body, { status: error.status })
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
    return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  }

  return internalServerError()
}

export async function parseRequestJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => {
    throw badRequest('Invalid JSON body')
  })

  return schema.parse(body)
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()

  if (!session) {
    throw unauthorized()
  }

  return session
}