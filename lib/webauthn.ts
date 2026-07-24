import { isoBase64URL } from '@simplewebauthn/server/helpers'

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

export function getRelyingPartyName(): string {
  return requireEnv('WEBAUTHN_RP_NAME')
}

export function getRelyingPartyId(): string {
  return requireEnv('WEBAUTHN_RP_ID')
}

export function getExpectedOrigins(): string[] {
  return requireEnv('WEBAUTHN_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getExpectedRelyingPartyIds(): string[] {
  return getRelyingPartyId()
    .split(',')
    .map((rpId) => rpId.trim())
    .filter(Boolean)
}

export function toCredentialIdString(value: string | Uint8Array): string {
  return typeof value === 'string' ? value : isoBase64URL.fromBuffer(value.slice())
}

export function toCredentialPublicKey(buffer: Uint8Array): Buffer {
  return Buffer.from(buffer)
}