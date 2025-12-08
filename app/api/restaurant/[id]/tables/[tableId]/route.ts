import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/restaurant/[id]/tables/[tableId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId, tableId } = await params


    // Get table with session information and user details
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        userId: session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            restaurantName: true,
            restaurantAddress: true,
            restaurantPhone: true
          }
        },
        sessions: {
          where: {
            status: {
              in: ['SEATED', 'ORDERING', 'ORDERED', 'SERVING', 'DINING', 'BILLING']
            }
          },
          orderBy: {
            checkInTime: 'desc'
          },
          take: 1,
          include: {
            waiter: {
              select: {
                id: true,
                ownerName: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Format response with session as singular
    const formattedTable = {
      ...table,
      session: table.sessions.length > 0 ? table.sessions[0] : null,
      sessions: undefined // Remove the sessions array
    }

    return NextResponse.json(formattedTable)

  } catch (error) {
    console.error('Get table error:', error)
    return NextResponse.json(
      { error: 'Failed to get table' },
      { status: 500 }
    )
  }
}

// PUT /api/restaurant/[id]/tables/[tableId]
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


    // Verify table exists and belongs to the user
    const existingTable = await prisma.table.findFirst({
      where: {
        id: tableId,
        userId: session.user.id
      }
    })

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const body = await request.json()
    const { number, name, capacity, isActive } = body

    if (!number || !number.trim()) {
      return NextResponse.json({ error: 'Table number is required' }, { status: 400 })
    }

    if (!capacity || capacity < 1) {
      return NextResponse.json({ error: 'Valid capacity is required' }, { status: 400 })
    }

    // Check if table number already exists for another table for this user
    if (number.trim() !== existingTable.number) {
      const conflictingTable = await prisma.table.findUnique({
        where: {
          userId_number: {
            userId: session.user.id,
            number: number.trim()
          }
        }
      })

      if (conflictingTable) {
        return NextResponse.json({ error: 'Table number already exists' }, { status: 400 })
      }
    }

    // Update table (verify ownership)
    const table = await prisma.table.update({
      where: { 
        id: tableId,
        userId: session.user.id
      },
      data: {
        number: number.trim(),
        name: name?.trim() || null,
        capacity: parseInt(capacity),
        isActive: isActive !== false
      }
    })

    return NextResponse.json(table)

  } catch (error) {
    console.error('Update table error:', error)
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    )
  }
}

// DELETE /api/restaurant/[id]/tables/[tableId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId, tableId } = await params


    // Verify table exists and belongs to the user
    const existingTable = await prisma.table.findFirst({
      where: {
        id: tableId,
        userId: session.user.id
      }
    })

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Check if table has any orders (optional - you might want to prevent deletion if there are orders)
    const orderCount = await prisma.order.count({
      where: {
        tableId: tableId
      }
    })

    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete table with existing orders. Set it to inactive instead.' },
        { status: 400 }
      )
    }

    // Delete table (verify ownership)
    await prisma.table.delete({
      where: { 
        id: tableId,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true, message: 'Table deleted successfully' })

  } catch (error) {
    console.error('Delete table error:', error)
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    )
  }
}