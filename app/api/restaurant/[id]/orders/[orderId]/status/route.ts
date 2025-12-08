import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, orderId } = await params
    const body = await request.json()


    const { status, preparingAt, readyAt, servedAt, cookId: _cookId, servedBy } = body

    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVING', 'DELIVERED', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = { status }
    
    // Add timestamp fields based on status
    if (status === 'PREPARING' && preparingAt) {
      updateData.preparingAt = new Date(preparingAt)
      updateData.cookId = session.user.id // Assign cook
    }
    
    if (status === 'READY' && readyAt) {
      updateData.readyAt = new Date(readyAt)
    }
    
    if (status === 'SERVING' || status === 'DELIVERED') {
      updateData.servedAt = servedAt ? new Date(servedAt) : new Date()
      updateData.servedBy = servedBy || session.user.id
    }

    // Update order status with enhanced details
    const updatedOrder = await prisma.order.update({
      where: { 
        id: orderId,
        userId: session.user.id // Ensure order belongs to the user
      },
      data: updateData,
      include: {
        table: {
          select: {
            id: true,
            number: true,
            name: true
          }
        },
        session: {
          select: {
            id: true,
            customerName: true,
            partySize: true
          }
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        },
        waiter: {
          select: {
            id: true,
            ownerName: true
          }
        },
        cook: {
          select: {
            id: true,
            ownerName: true
          }
        },
        server: {
          select: {
            id: true,
            ownerName: true
          }
        }
      }
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order status:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}