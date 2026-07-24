import { SignJWT, jwtVerify } from 'jose'
import type { Session } from '@/lib/db'

export const SESSION_COOKIE_NAME = 'todo_app_session'

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7

function getSessionSecret(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    return null
  }

  return new TextEncoder().encode(secret)
}

export async function createSession(session: Session): Promise<void> {
  const secret = getSessionSecret()

  if (!secret) {
    throw new Error('SESSION_SECRET is not configured')
  }

  const token = await new SignJWT({
    userId: session.userId,
    username: session.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret)

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  })
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  const secret = getSessionSecret()

  if (!secret) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, secret)

    if (typeof payload.userId !== 'number' || typeof payload.username !== 'string') {
      return null
    }

    return {
      userId: payload.userId,
      username: payload.username,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return verifySessionToken(token)
}

export async function deleteSession(): Promise<void> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
