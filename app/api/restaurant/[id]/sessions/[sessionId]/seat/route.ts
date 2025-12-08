import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }

    // Check if table exists and is available
    const table = await prisma.table.findFirst({
      where: { 
        id: tableId, 
        userId: session.user.id, 
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
        userId: session.user.id
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