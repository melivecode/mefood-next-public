import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// PUT /api/restaurant/[id]/tables/[tableId]/position
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId, tableId } = await params

    // Get user's restaurant to verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId || user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify table exists and belongs to the restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId: restaurantId
      }
    })

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const body = await request.json()
    const { gridX, gridY, gridWidth, gridHeight } = body

    // Validate grid positions
    if (
      typeof gridX !== 'number' || gridX < 0 ||
      typeof gridY !== 'number' || gridY < 0 ||
      typeof gridWidth !== 'number' || gridWidth < 1 ||
      typeof gridHeight !== 'number' || gridHeight < 1
    ) {
      return NextResponse.json({ error: 'Invalid grid position values' }, { status: 400 })
    }

    // Update table position only (verify ownership)
    const table = await prisma.table.update({
      where: {
        id: tableId,
        restaurantId: restaurantId
      },
      data: {
        gridX: gridX,
        gridY: gridY,
        gridWidth: gridWidth,
        gridHeight: gridHeight
      }
    })

    return NextResponse.json(table)

  } catch (error) {
    console.error('Update table position error:', error)
    return NextResponse.json(
      { error: 'Failed to update table position' },
      { status: 500 }
    )
  }
}
