import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params

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

    // Get order items
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId },
      include: {
        menuItem: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(orderItems)
  } catch (error) {
    console.error('Error fetching order items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const { menuItemId, quantity, price, notes, selections } = body

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

    // Verify menu item exists and belongs to user
    const menuItem = await prisma.menuItem.findFirst({
      where: { 
        id: menuItemId,
        userId: session.user.id 
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Create order item
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        menuItemId,
        quantity: Number(quantity) || 1,
        price: price || Number(menuItem.price),
        notes: notes?.trim() || null,
        selections: selections ? JSON.stringify(selections) : undefined
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

    return NextResponse.json(orderItem, { status: 201 })
  } catch (error) {
    console.error('Error adding order item:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}