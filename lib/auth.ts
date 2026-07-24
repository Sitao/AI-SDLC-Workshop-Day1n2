import { cookies } from 'next/headers'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { Session } from '@/lib/db'

export const SESSION_COOKIE_NAME = 'todo_app_session'

const REGISTER_STATE_COOKIE_NAME = 'todo_app_register_state'
const LOGIN_STATE_COOKIE_NAME = 'todo_app_login_state'

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7
const AUTH_STATE_DURATION_SECONDS = 60 * 10

type AuthFlow = 'register' | 'login'

type AuthFlowState = {
  flow: AuthFlow
  username: string
  challenge: string
}

function getSessionSecret(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    return null
  }

  return new TextEncoder().encode(secret)
}

function getAuthStateCookieName(flow: AuthFlow): string {
  return flow === 'register' ? REGISTER_STATE_COOKIE_NAME : LOGIN_STATE_COOKIE_NAME
}

async function signToken(payload: JWTPayload, expiresInSeconds: number): Promise<string> {
  const secret = getSessionSecret()

  if (!secret) {
    throw new Error('SESSION_SECRET is not configured')
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secret)
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  const secret = getSessionSecret()

  if (!secret) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export async function createSession(session: Session): Promise<void> {
  const token = await signToken({
    userId: session.userId,
    username: session.username,
  }, SESSION_DURATION_SECONDS)

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
  const payload = await verifyToken(token)

  if (!payload || typeof payload.userId !== 'number' || typeof payload.username !== 'string') {
    return null
  }

  return {
    userId: payload.userId,
    username: payload.username,
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return verifySessionToken(token)
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function setAuthFlowState(state: AuthFlowState): Promise<void> {
  const cookieStore = await cookies()
  const token = await signToken(
    {
      flow: state.flow,
      username: state.username,
      challenge: state.challenge,
    },
    AUTH_STATE_DURATION_SECONDS,
  )

  cookieStore.set(getAuthStateCookieName(state.flow), token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_STATE_DURATION_SECONDS,
  })
}

export async function getAuthFlowState(flow: AuthFlow): Promise<AuthFlowState | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAuthStateCookieName(flow))?.value

  if (!token) {
    return null
  }

  const payload = await verifyToken(token)

  if (
    !payload ||
    payload.flow !== flow ||
    typeof payload.username !== 'string' ||
    typeof payload.challenge !== 'string'
  ) {
    return null
  }

  return {
    flow,
    username: payload.username,
    challenge: payload.challenge,
  }
}

export async function clearAuthFlowState(flow: AuthFlow): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(getAuthStateCookieName(flow))
}
