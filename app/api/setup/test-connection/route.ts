import { NextRequest, NextResponse } from 'next/server'
import { canAccessSetup } from '@/lib/utils/setupCheck'

export async function POST(request: NextRequest) {
  try {
    // Security: Only allow if setup is needed
    const canAccess = await canAccessSetup()
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { connectionString } = body

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      )
    }

    // Dynamically create a Prisma client with the provided connection string
    // Note: This is for testing purposes only
    const { PrismaClient } = await import('@prisma/client')

    // Test connection by creating a temporary client
    const testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString
        }
      }
    })

    try {
      await testPrisma.$connect()
      await testPrisma.$disconnect()

      return NextResponse.json({
        success: true,
        message: 'Database connection successful'
      })
    } catch (dbError) {
      await testPrisma.$disconnect()
      return NextResponse.json({
        success: false,
        error: dbError instanceof Error ? dbError.message : 'Connection failed'
      })
    }
  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test connection'
      },
      { status: 500 }
    )
  }
}
