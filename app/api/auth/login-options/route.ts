import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { badRequest, handleRouteError, parseRequestJson } from '@/lib/api'
import { setAuthFlowState } from '@/lib/auth'
import { authenticatorDB, userDB } from '@/lib/db'
import { getRelyingPartyId } from '@/lib/webauthn'

const loginOptionsSchema = z.object({
  username: z.string().trim().min(1).max(64),
})

export async function POST(request: Request) {
  try {
    const { username } = await parseRequestJson(request, loginOptionsSchema)
    const user = userDB.findByUsername(username)

    if (!user) {
      throw badRequest('Invalid credentials')
    }

    const authenticators = authenticatorDB.listByUserId(user.id)

    if (authenticators.length === 0) {
      throw badRequest('Invalid credentials')
    }

    const options = await generateAuthenticationOptions({
      rpID: getRelyingPartyId(),
      allowCredentials: authenticators.map((authenticator) => ({
        id: authenticator.credential_id,
      })),
      userVerification: 'preferred',
    })

    await setAuthFlowState({
      flow: 'login',
      username,
      challenge: options.challenge,
    })

    return NextResponse.json({ options })
  } catch (error) {
    return handleRouteError(error)
  }
}