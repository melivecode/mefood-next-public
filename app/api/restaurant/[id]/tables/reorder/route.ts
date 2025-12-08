import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT /api/restaurant/[id]/tables/reorder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId } = await params


    const body = await request.json()
    const { tableIds } = body

    if (!Array.isArray(tableIds) || tableIds.length === 0) {
      return NextResponse.json({ error: 'Table IDs array is required' }, { status: 400 })
    }

    // Update sort order for each table
    const updatePromises = tableIds.map((tableId: string, index: number) => 
      prisma.table.update({
        where: { 
          id: tableId,
          userId: session.user.id // Ensure table belongs to this user
        },
        data: { sortOrder: index }
      })
    )

    await Promise.all(updatePromises)

    // Get updated tables
    const tables = await prisma.table.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { sortOrder: 'asc' },
        { number: 'asc' }
      ]
    })

    return NextResponse.json({ message: 'Tables reordered successfully', tables })

  } catch (error) {
    console.error('Reorder tables error:', error)
    return NextResponse.json(
      { error: 'Failed to reorder tables' },
      { status: 500 }
    )
  }
}