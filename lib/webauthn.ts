import { isoBase64URL } from '@simplewebauthn/server/helpers'

function getEnvOrDefault(name: string, developmentDefault: string): string {
  const value = process.env[name]

  if (value) {
    return value
  }

  if (process.env.NODE_ENV !== 'production') {
    return developmentDefault
  }

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

export function getRelyingPartyName(): string {
  return getEnvOrDefault('WEBAUTHN_RP_NAME', 'Todo App')
}

export function getRelyingPartyId(): string {
  return getEnvOrDefault('WEBAUTHN_RP_ID', 'localhost')
}

export function getExpectedOrigins(): string[] {
  return getEnvOrDefault('WEBAUTHN_ORIGIN', 'http://localhost:3000,http://127.0.0.1:3000')
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