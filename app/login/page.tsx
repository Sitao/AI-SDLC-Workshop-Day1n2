'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AuthApiError {
  error?: string
}

interface AuthOptionsEnvelope {
  options?: unknown
}

type AuthAction = 'register' | 'login'

const AUTH_REQUEST_TIMEOUT_MS = 15000
const AUTH_TIMEOUT_MESSAGE = 'Passkey request timed out. Please try again.'

function getApiErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const errorPayload = payload as AuthApiError

    if (typeof errorPayload.error === 'string' && errorPayload.error.trim()) {
      return errorPayload.error
    }
  }

  return fallbackMessage
}

function getAuthOptions(payload: unknown): unknown {
  if (payload && typeof payload === 'object' && 'options' in payload) {
    const envelope = payload as AuthOptionsEnvelope
    return envelope.options
  }

  return payload
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeAction, setActiveAction] = useState<AuthAction | null>(null)

  useEffect(() => {
    let isMounted = true

    async function checkSession(): Promise<void> {
      try {
        const response = await fetch('/api/auth/me')

        if (response.ok && isMounted) {
          router.replace('/')
        }
      } catch {
        // Ignore network issues and keep the user on the login page.
      }
    }

    void checkSession()

    return () => {
      isMounted = false
    }
  }, [router])

  async function handleRegister(): Promise<void> {
    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setError('Username is required')
      return
    }

    if (trimmedUsername.length > 64) {
      setError('Username must be 64 characters or fewer')
      return
    }

    setError(null)
    setIsSubmitting(true)
    setActiveAction('register')

    try {
      const optionsResponse = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: trimmedUsername }),
      })

      const optionsPayload = (await optionsResponse.json().catch(() => ({}))) as unknown

      if (!optionsResponse.ok) {
        setError(getApiErrorMessage(optionsPayload, 'Unable to start registration'))
        return
      }

      const registrationOptions = getAuthOptions(optionsPayload)

      if (!registrationOptions || typeof registrationOptions !== 'object') {
        setError('Invalid registration options received')
        return
      }

      const { startRegistration } = await import('@simplewebauthn/browser')
      const attestation = await withTimeout(
        startRegistration({ optionsJSON: registrationOptions as Parameters<typeof startRegistration>[0]['optionsJSON'] }),
        AUTH_REQUEST_TIMEOUT_MS,
        AUTH_TIMEOUT_MESSAGE,
      )

      const verifyResponse = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: trimmedUsername, response: attestation }),
      })

      const verifyPayload = (await verifyResponse.json().catch(() => ({}))) as unknown

      if (!verifyResponse.ok) {
        setError(getApiErrorMessage(verifyPayload, 'Registration failed'))
        return
      }

      router.push('/')
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message === AUTH_TIMEOUT_MESSAGE) {
        setError(AUTH_TIMEOUT_MESSAGE)
      } else if (requestError instanceof Error && requestError.name === 'NotAllowedError') {
        setError('Passkey request was cancelled')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
      setActiveAction(null)
    }
  }

  async function handleLogin(): Promise<void> {
    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setError('Username is required')
      return
    }

    if (trimmedUsername.length > 64) {
      setError('Username must be 64 characters or fewer')
      return
    }

    setError(null)
    setIsSubmitting(true)
    setActiveAction('login')

    try {
      const optionsResponse = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: trimmedUsername }),
      })

      const optionsPayload = (await optionsResponse.json().catch(() => ({}))) as unknown

      if (!optionsResponse.ok) {
        setError(getApiErrorMessage(optionsPayload, 'Unable to start login'))
        return
      }

      const loginOptions = getAuthOptions(optionsPayload)

      if (!loginOptions || typeof loginOptions !== 'object') {
        setError('Invalid login options received')
        return
      }

      const { startAuthentication } = await import('@simplewebauthn/browser')
      const assertion = await withTimeout(
        startAuthentication({ optionsJSON: loginOptions as Parameters<typeof startAuthentication>[0]['optionsJSON'] }),
        AUTH_REQUEST_TIMEOUT_MS,
        AUTH_TIMEOUT_MESSAGE,
      )

      const verifyResponse = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: trimmedUsername, response: assertion }),
      })

      const verifyPayload = (await verifyResponse.json().catch(() => ({}))) as unknown

      if (!verifyResponse.ok) {
        setError(getApiErrorMessage(verifyPayload, 'Login failed'))
        return
      }

      router.push('/')
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message === AUTH_TIMEOUT_MESSAGE) {
        setError(AUTH_TIMEOUT_MESSAGE)
      } else if (requestError instanceof Error && requestError.name === 'NotAllowedError') {
        setError('Passkey request was cancelled')
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
      setActiveAction(null)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-slate-900">Welcome Back</h1>
        <p className="mt-2 text-center text-sm text-slate-600">Sign in with your passkey to continue.</p>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username webauthn"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              disabled={isSubmitting}
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleRegister}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting && activeAction === 'register' ? 'Registering...' : 'Register'}
            </button>
            <button
              type="button"
              onClick={handleLogin}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting && activeAction === 'login' ? 'Logging in...' : 'Login'}
            </button>
          </div>

          {isSubmitting ? (
            <p className="text-xs text-slate-500" aria-live="polite">
              Waiting for passkey confirmation...
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
