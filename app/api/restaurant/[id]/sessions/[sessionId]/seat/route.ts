import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId, sessionId } = await params
    const body = await request.json()

    const { tableId } = body

    // Get user's restaurant to verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId || user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }

    // Check if table exists and is available
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId: restaurantId,
        isActive: true
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found or inactive' }, { status: 400 })
    }

    // Check if table is already occupied
    const occupiedTable = await prisma.customerSession.findFirst({
      where: {
        tableId,
        status: {
          in: ['SEATED', 'ORDERING', 'ORDERED', 'SERVING', 'DINING', 'BILLING']
        }
      }
    })

    if (occupiedTable) {
      return NextResponse.json({ error: 'Table is already occupied' }, { status: 400 })
    }

    // Update the customer session (verify ownership)
    const updatedSession = await prisma.customerSession.update({
      where: {
        id: sessionId,
        restaurantId: restaurantId
      },
      data: {
        tableId,
        status: 'SEATED',
        seatedTime: new Date(),
        waiterId: session.user.id
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Seat customer error:', error)
    return NextResponse.json(
      { error: 'Failed to seat customer' },
      { status: 500 }
    )
  }
}
