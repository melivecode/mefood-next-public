import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


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

    // Get user's restaurant to verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId || user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

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
          restaurantId: restaurantId // Ensure table belongs to this restaurant
        },
        data: { sortOrder: index }
      })
    )

    await Promise.all(updatePromises)

    // Get updated tables
    const tables = await prisma.table.findMany({
      where: { restaurantId: restaurantId },
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
