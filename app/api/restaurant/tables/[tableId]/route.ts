import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tableId } = await params

    const table = await prisma.table.findFirst({
      where: { 
        id: tableId,
        userId: session.user.id 
      },
      include: {
        sessions: {
          where: {
            status: {
              in: ['SEATED', 'ORDERING', 'ORDERED', 'SERVING', 'DINING', 'BILLING']
            }
          },
          orderBy: {
            checkInTime: 'desc'
          },
          take: 1
        }
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Transform to include single session as the page expects
    const { sessions, ...tableWithoutSessions } = table
    const tableWithSession = {
      ...tableWithoutSessions,
      session: sessions?.[0] || null
    }

    return NextResponse.json(tableWithSession)
  } catch (error) {
    console.error('Error fetching table:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tableId } = await params
    const body = await request.json()
    const { number, name, capacity, isActive, sortOrder, gridX, gridY, gridWidth, gridHeight } = body

    // Verify table exists and belongs to user
    const existingTable = await prisma.table.findFirst({
      where: { 
        id: tableId,
        userId: session.user.id 
      }
    })

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Validate required fields
    if (!number || number.trim().length === 0) {
      return NextResponse.json(
        { error: 'Table number is required' },
        { status: 400 }
      )
    }

    // Check if new table number already exists (if number is being changed)
    if (number.trim() !== existingTable.number) {
      const duplicateTable = await prisma.table.findFirst({
        where: {
          userId: session.user.id,
          number: number.trim(),
          id: { not: tableId }
        }
      })

      if (duplicateTable) {
        return NextResponse.json(
          { error: 'A table with this number already exists' },
          { status: 400 }
        )
      }
    }

    // Update table
    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: {
        number: number.trim(),
        name: name?.trim() || null,
        capacity: Number(capacity) || 4,
        isActive: Boolean(isActive ?? true),
        sortOrder: Number(sortOrder) || 0,
        gridX: Number(gridX) || 0,
        gridY: Number(gridY) || 0,
        gridWidth: Number(gridWidth) || 2,
        gridHeight: Number(gridHeight) || 2
      }
    })

    return NextResponse.json(updatedTable)
  } catch (error) {
    console.error('Error updating table:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A table with this number already exists' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tableId } = await params

    // Verify table exists and belongs to user
    const existingTable = await prisma.table.findFirst({
      where: { 
        id: tableId,
        userId: session.user.id 
      },
      include: {
        _count: {
          select: { 
            orders: true,
            sessions: true 
          }
        }
      }
    })

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Check if table has active orders or sessions
    if (existingTable._count.orders > 0 || existingTable._count.sessions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete table with existing orders or sessions' },
        { status: 400 }
      )
    }

    // Delete table
    await prisma.table.delete({
      where: { id: tableId }
    })

    return NextResponse.json({ message: 'Table deleted successfully' })
  } catch (error) {
    console.error('Error deleting table:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}