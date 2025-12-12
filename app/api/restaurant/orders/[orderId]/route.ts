import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's restaurant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const { orderId } = await params

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: user.restaurantId
      },
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

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's restaurant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const { orderId } = await params
    const body = await request.json()
    const {
      status,
      notes,
      customerName,
      customerPhone,
      customerEmail,
      totalAmount
    } = body

    // Verify order exists and belongs to user's restaurant
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: user.restaurantId
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (customerName !== undefined) updateData.customerName = customerName?.trim() || null
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone?.trim() || null
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail?.trim() || null
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount

    // Set status timestamps
    if (status === 'PREPARING' && !existingOrder.preparingAt) {
      updateData.preparingAt = new Date()
    }
    if (status === 'READY' && !existingOrder.readyAt) {
      updateData.readyAt = new Date()
    }
    if (status === 'DELIVERED' && !existingOrder.servedAt) {
      updateData.servedAt = new Date()
    }

    // Update order
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
    console.error('Error updating order:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's restaurant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const { orderId } = await params

    // Verify order exists and belongs to user's restaurant
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: user.restaurantId
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only allow deletion of pending or cancelled orders
    if (!['PENDING', 'CANCELLED'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: 'Can only delete pending or cancelled orders' },
        { status: 400 }
      )
    }

    // Delete order (items will be cascade deleted)
    await prisma.order.delete({
      where: { id: orderId }
    })

    return NextResponse.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Error deleting order:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}