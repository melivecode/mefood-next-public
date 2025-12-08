import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tableIds } = body

    // Validate input
    if (!Array.isArray(tableIds) || tableIds.length === 0) {
      return NextResponse.json(
        { error: 'Table IDs array is required' },
        { status: 400 }
      )
    }

    // Verify all tables exist and belong to user
    const tables = await prisma.table.findMany({
      where: {
        id: { in: tableIds },
        userId: session.user.id
      },
      select: { id: true }
    })

    if (tables.length !== tableIds.length) {
      return NextResponse.json(
        { error: 'One or more tables not found or do not belong to user' },
        { status: 400 }
      )
    }

    // Update sortOrder for each table based on array position
    const updatePromises = tableIds.map((tableId: string, index: number) =>
      prisma.table.update({
        where: { id: tableId },
        data: { sortOrder: index }
      })
    )

    await Promise.all(updatePromises)

    // Return updated tables
    const updatedTables = await prisma.table.findMany({
      where: { 
        userId: session.user.id,
        isActive: true
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    return NextResponse.json(updatedTables)
  } catch (error) {
    console.error('Error reordering tables:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}