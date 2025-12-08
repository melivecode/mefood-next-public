import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = [
      'PENDING',
      'CONFIRMED', 
      'PREPARING',
      'READY',
      'SERVING',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED'
    ]

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      )
    }

    // Verify order exists and belongs to user
    const existingOrder = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId: session.user.id 
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Build update data with status timestamps
    const updateData: any = {
      status
    }

    // Set timestamps based on status
    const now = new Date()
    switch (status) {
      case 'PREPARING':
        if (!existingOrder.preparingAt) {
          updateData.preparingAt = now
        }
        break
      case 'READY':
        if (!existingOrder.readyAt) {
          updateData.readyAt = now
        }
        // Also set preparingAt if not already set
        if (!existingOrder.preparingAt) {
          updateData.preparingAt = now
        }
        break
      case 'DELIVERED':
      case 'COMPLETED':
        if (!existingOrder.servedAt) {
          updateData.servedAt = now
        }
        // Also set previous timestamps if not already set
        if (!existingOrder.preparingAt) {
          updateData.preparingAt = now
        }
        if (!existingOrder.readyAt) {
          updateData.readyAt = now
        }
        break
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        table: true,
        session: true,
        items: {
          include: {
            menuItem: true
          }
        }
      }
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order status:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}