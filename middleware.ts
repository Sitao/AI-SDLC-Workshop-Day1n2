import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth'

const protectedRoutes = new Set(['/', '/calendar'])

export async function middleware(request: NextRequest) {
  const bypassAuthForE2E = process.env.E2E_AUTH_BYPASS === '1'
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  if (pathname === '/login' && session && !bypassAuthForE2E) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (protectedRoutes.has(pathname) && !session && !bypassAuthForE2E) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/calendar', '/login'],
}
