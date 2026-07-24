import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, conflict, handleRouteError, parseRequestJson } from '@/lib/api'
import { clearAuthFlowState, createSession, getAuthFlowState } from '@/lib/auth'
import { authenticatorDB, userDB } from '@/lib/db'
import { getExpectedOrigins, getExpectedRelyingPartyIds, toCredentialIdString, toCredentialPublicKey } from '@/lib/webauthn'

const registerVerifySchema = z.object({
  username: z.string().trim().min(1).max(64),
  response: z.record(z.string(), z.unknown()),
})

export async function POST(request: Request) {
  try {
    const { username, response } = await parseRequestJson(request, registerVerifySchema)
    const state = await getAuthFlowState('register')
    await clearAuthFlowState('register')

    if (!state || state.username !== username) {
      throw badRequest('Registration session expired or invalid')
    }

    const verification = await verifyRegistrationResponse({
      response: response as unknown as Parameters<typeof verifyRegistrationResponse>[0]['response'],
      expectedChallenge: state.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getExpectedRelyingPartyIds(),
    })

    if (!verification.verified || !verification.registrationInfo) {
      throw badRequest('Registration verification failed')
    }

    const credentialId = toCredentialIdString(verification.registrationInfo.credential.id)

    if (authenticatorDB.findByCredentialId(credentialId)) {
      throw conflict('Authenticator already registered')
    }

    const user = userDB.findByUsername(username) ?? userDB.create(username)

    authenticatorDB.create({
      user_id: user.id,
      credential_id: credentialId,
      credential_public_key: toCredentialPublicKey(verification.registrationInfo.credential.publicKey),
      counter: verification.registrationInfo.credential.counter ?? 0,
    })

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