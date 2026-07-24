import { NextResponse } from 'next/server'
import { handleRouteError, requireSession } from '@/lib/api'
import { holidayDB } from '@/lib/db'

export async function GET() {
  try {
    await requireSession()
    return NextResponse.json({ holidays: holidayDB.listAll() })
  } catch (error) {
    return handleRouteError(error)
  }
}