import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { deleteSession } from '@/lib/auth'

export async function POST() {
  try {
    await deleteSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}