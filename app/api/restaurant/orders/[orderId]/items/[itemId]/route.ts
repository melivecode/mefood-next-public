import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, itemId } = await params

    // Verify order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId: session.user.id 
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get order item
    const orderItem = await prisma.orderItem.findFirst({
      where: { 
        id: itemId,
        orderId 
      },
      include: {
        menuItem: true
      }
    })

    if (!orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    return NextResponse.json(orderItem)
  } catch (error) {
    console.error('Error fetching order item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, itemId } = await params
    const body = await request.json()
    const { quantity, price, notes, selections } = body

    // Verify order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId: session.user.id 
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify order item exists
    const existingItem = await prisma.orderItem.findFirst({
      where: { 
        id: itemId,
        orderId 
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    // Update order item
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: quantity !== undefined ? Number(quantity) : existingItem.quantity,
        price: price !== undefined ? Number(price) : existingItem.price,
        notes: notes !== undefined ? notes?.trim() || null : existingItem.notes,
        selections: selections !== undefined ? JSON.stringify(selections) : (existingItem.selections as any)
      },
      include: {
        menuItem: true
      }
    })

    // Update order total amount
    const allItems = await prisma.orderItem.findMany({
      where: { orderId }
    })
    const newTotal = allItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
    
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal }
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating order item:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, itemId } = await params

    // Verify order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId: session.user.id 
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify order item exists
    const existingItem = await prisma.orderItem.findFirst({
      where: { 
        id: itemId,
        orderId 
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    // Delete order item
    await prisma.orderItem.delete({
      where: { id: itemId }
    })

    // Update order total amount
    const remainingItems = await prisma.orderItem.findMany({
      where: { orderId }
    })
    const newTotal = remainingItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
    
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal }
    })

    return NextResponse.json({ message: 'Order item deleted successfully' })
  } catch (error) {
    console.error('Error deleting order item:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}