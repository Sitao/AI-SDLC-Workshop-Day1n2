import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, conflict, handleRouteError, parseRequestJson } from '@/lib/api'
import { clearAuthFlowState, createSession, getAuthFlowState } from '@/lib/auth'
import { authenticatorDB, userDB } from '@/lib/db'
import { getExpectedOrigins, getExpectedRelyingPartyIds } from '@/lib/webauthn'

const loginVerifySchema = z.object({
  username: z.string().trim().min(1).max(64),
  response: z.object({
    id: z.string().min(1),
  }).catchall(z.unknown()),
})

export async function POST(request: Request) {
  try {
    const { username, response } = await parseRequestJson(request, loginVerifySchema)
    const state = await getAuthFlowState('login')
    await clearAuthFlowState('login')

    if (!state || state.username !== username) {
      throw badRequest('Login session expired or invalid')
    }

    const user = userDB.findByUsername(username)

    if (!user) {
      throw badRequest('Invalid credentials')
    }

    const authenticator = authenticatorDB.findByCredentialId(response.id)

    if (!authenticator || authenticator.user_id !== user.id) {
      throw badRequest('Invalid credentials')
    }

    const verification = await verifyAuthenticationResponse({
      response: response as unknown as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
      expectedChallenge: state.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getExpectedRelyingPartyIds(),
      credential: {
        id: authenticator.credential_id,
        publicKey: Uint8Array.from(authenticator.credential_public_key),
        counter: authenticator.counter ?? 0,
      },
    })

    if (!verification.verified) {
      throw badRequest('Authentication verification failed')
    }

    const storedCounter = authenticator.counter ?? 0
    const newCounter = verification.authenticationInfo.newCounter

    if (!(storedCounter === 0 && newCounter === 0) && newCounter <= storedCounter) {
      throw conflict('Authenticator counter did not advance')
    }

    authenticatorDB.updateCounter(authenticator.credential_id, newCounter)
    await createSession({ userId: user.id, username: user.username })

    return NextResponse.json({
      verified: true,
      user: {
        id: user.id,
        username: user.username,
      },
    })
  } catch (error) {
    return handleRouteError(error)
  }
}