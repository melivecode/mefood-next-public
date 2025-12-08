import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    // Get session with all orders and their items for checkout calculation
    const customerSession = await prisma.customerSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id 
      },
      include: {
        table: true,
        orders: {
          where: {
            status: {
              not: 'CANCELLED'
            }
          },
          include: {
            items: {
              include: {
                menuItem: {
                  include: {
                    category: true
                  }
                }
              }
            }
          }
        },
        payments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!customerSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Calculate totals
    let subtotal = 0
    const itemsByCategory: { [key: string]: any[] } = {}

    customerSession.orders.forEach(order => {
      order.items.forEach(item => {
        const categoryName = item.menuItem.category.name
        if (!itemsByCategory[categoryName]) {
          itemsByCategory[categoryName] = []
        }
        
        const itemTotal = Number(item.price) * item.quantity
        subtotal += itemTotal
        
        itemsByCategory[categoryName].push({
          ...item,
          menuItem: item.menuItem,
          totalPrice: itemTotal,
          selections: item.selections ? JSON.parse(item.selections as string) : null
        })
      })
    })

    // Prepare checkout summary
    const checkoutSummary = {
      session: {
        id: customerSession.id,
        customerName: customerSession.customerName,
        customerPhone: customerSession.customerPhone,
        customerEmail: customerSession.customerEmail,
        partySize: customerSession.partySize,
        checkInTime: customerSession.checkInTime,
        status: customerSession.status
      },
      table: customerSession.table,
      itemsByCategory,
      totals: {
        subtotal,
        itemCount: customerSession.orders.reduce((sum, order) => 
          sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        )
      },
      orders: customerSession.orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        orderedAt: order.orderedAt,
        itemCount: order.items.length
      })),
      existingPayments: customerSession.payments
    }

    return NextResponse.json(checkoutSummary)

  } catch (error) {
    console.error('Error getting checkout data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    // Verify customer session exists and belongs to user
    const customerSession = await prisma.customerSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id 
      }
    })

    if (!customerSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update customer session status to COMPLETED and set checkout time
    const updatedSession = await prisma.customerSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        checkOutTime: new Date()
      }
    })

    return NextResponse.json(updatedSession)

  } catch (error) {
    console.error('Error checking out customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}