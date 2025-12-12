import { NextResponse } from 'next/server'
import { checkSetupStatus } from '@/lib/utils/setupCheck'

export async function GET() {
  try {
    const status = await checkSetupStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Setup status check error:', error)
    return NextResponse.json(
      {
        databaseConnected: false,
        tablesExist: false,
        hasAdminUser: false,
        hasRestaurant: false,
        needsSetup: true,
        error: error instanceof Error ? error.message : 'Failed to check setup status'
      },
      { status: 500 }
    )
  }
}
