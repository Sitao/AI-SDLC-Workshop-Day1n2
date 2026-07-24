const SINGAPORE_TIME_ZONE = 'Asia/Singapore'

type SingaporeDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const singaporePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SINGAPORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function getSingaporeDateParts(date: Date): SingaporeDateParts {
  const parts = singaporePartsFormatter.formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
    second: Number(parts.find((part) => part.type === 'second')?.value),
  }
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0')
}

export function getSingaporeNow(): Date {
  return new Date()
}

export function toSingaporeISOString(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? parseSingaporeDateTime(dateInput) : dateInput
  const parts = getSingaporeDateParts(date)

  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}T${padDatePart(parts.hour)}:${padDatePart(parts.minute)}:${padDatePart(parts.second)}`
}

export function normalizeSingaporeDateTime(dateInput: string): string {
  const normalized = dateInput.trim()
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)

  if (!match) {
    throw new Error('Expected Singapore datetime in YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss format')
  }

  const [, year, month, day, hour, minute, second = '00'] = match
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

export function parseSingaporeDateTime(dateInput: string): Date {
  const normalized = normalizeSingaporeDateTime(dateInput)
  const [datePart, timePart] = normalized.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second] = timePart.split(':').map(Number)

  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second))
}

export function addMinutesSingapore(dateInput: string, minutes: number): string {
  const date = parseSingaporeDateTime(dateInput)
  date.setUTCMinutes(date.getUTCMinutes() + minutes)
  return toSingaporeISOString(date)
}

export function addDaysSingapore(dateInput: string, days: number): string {
  const date = parseSingaporeDateTime(dateInput)
  date.setUTCDate(date.getUTCDate() + days)
  return toSingaporeISOString(date)
}

export function addMonthsSingapore(dateInput: string, months: number): string {
  const normalized = normalizeSingaporeDateTime(dateInput)
  const [datePart, timePart] = normalized.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second] = timePart.split(':').map(Number)

  const targetMonthIndex = month - 1 + months
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonthIndex + 1, 0)).getUTCDate()
  const clampedDay = Math.min(day, lastDayOfTargetMonth)

  return normalizeSingaporeDateTime(
    `${targetYear}-${padDatePart(normalizedMonthIndex + 1)}-${padDatePart(clampedDay)}T${padDatePart(hour)}:${padDatePart(minute)}:${padDatePart(second)}`,
  )
}

export function addYearsSingapore(dateInput: string, years: number): string {
  return addMonthsSingapore(dateInput, years * 12)
}

export function formatSingaporeDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? parseSingaporeDateTime(dateInput) : dateInput

  return new Intl.DateTimeFormat('en-SG', {
    timeZone: SINGAPORE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export { SINGAPORE_TIME_ZONE }
