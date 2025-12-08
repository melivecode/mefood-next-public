import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const tableId = searchParams.get('tableId')
    const status = searchParams.get('status')

    // Build where clause
    const where: any = {
      userId: session.user.id
    }

    if (sessionId) where.sessionId = sessionId
    if (tableId) where.tableId = tableId
    if (status) where.status = status

    // Get all orders for the user with optional filters
    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        session: true,
        items: {
          include: {
            menuItem: true
          }
        }
      },
      orderBy: [
        { orderedAt: 'desc' }
      ]
    })

    return NextResponse.json(orders)

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      sessionId, 
      tableId, 
      customerName, 
      customerPhone, 
      customerEmail, 
      notes, 
      items,
      totalAmount 
    } = body

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      )
    }

    // Verify session exists and belongs to user if provided
    if (sessionId) {
      const customerSession = await prisma.customerSession.findFirst({
        where: { 
          id: sessionId,
          userId: session.user.id 
        }
      })

      if (!customerSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
    }

    // Verify table exists and belongs to user if provided
    if (tableId) {
      const table = await prisma.table.findFirst({
        where: { 
          id: tableId,
          userId: session.user.id 
        }
      })

      if (!table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 })
      }
    }

    // Calculate total amount if not provided
    let calculatedTotal = 0
    if (!totalAmount) {
      for (const item of items) {
        const menuItem = await prisma.menuItem.findFirst({
          where: { 
            id: item.menuItemId,
            userId: session.user.id 
          }
        })
        if (menuItem) {
          const itemPrice = Number(menuItem.price) * item.quantity
          
          // Add selection prices if any
          if (item.selections) {
            const _ = JSON.parse(item.selections)
            // Add logic to calculate selection prices if needed
          }
          
          calculatedTotal += itemPrice
        }
      }
    }

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { userId: session.user.id }
    })
    const orderNumber = `ORD${String(orderCount + 1).padStart(6, '0')}`

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'PENDING',
        totalAmount: totalAmount || calculatedTotal,
        customerName: customerName?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        customerEmail: customerEmail?.trim() || null,
        notes: notes?.trim() || null,
        sessionId: sessionId || null,
        tableId: tableId || null,
        userId: session.user.id,
        items: {
          create: items.map((item: any) => ({
            quantity: Number(item.quantity) || 1,
            price: item.price || 0,
            notes: item.notes?.trim() || null,
            selections: item.selections ? JSON.stringify(item.selections) : undefined,
            menuItemId: item.menuItemId
          }))
        }
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

    return NextResponse.json(order, { status: 201 })

  } catch (error) {
    console.error('Error creating order:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}