const SINGAPORE_TIME_ZONE = 'Asia/Singapore'

export function getSingaporeNow(): Date {
  return new Date()
}

export function formatSingaporeDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

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
