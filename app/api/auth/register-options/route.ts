import { generateRegistrationOptions } from '@simplewebauthn/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticatorDB, userDB } from '@/lib/db'
import { handleRouteError, parseRequestJson } from '@/lib/api'
import { setAuthFlowState } from '@/lib/auth'
import { getRelyingPartyId, getRelyingPartyName } from '@/lib/webauthn'

const registerOptionsSchema = z.object({
  username: z.string().trim().min(1).max(64),
})

export async function POST(request: Request) {
  try {
    const { username } = await parseRequestJson(request, registerOptionsSchema)
    const user = userDB.findByUsername(username)
    const authenticators = user ? authenticatorDB.listByUserId(user.id) : []

    const options = await generateRegistrationOptions({
      rpName: getRelyingPartyName(),
      rpID: getRelyingPartyId(),
      userName: username,
      userID: new TextEncoder().encode(String(user?.id ?? username)),
      excludeCredentials: authenticators.map((authenticator) => ({
        id: authenticator.credential_id,
      })),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    await setAuthFlowState({
      flow: 'register',
      username,
      challenge: options.challenge,
    })

    return NextResponse.json({ options })
  } catch (error) {
    return handleRouteError(error)
  }
}