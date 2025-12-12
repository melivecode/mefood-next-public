import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId } = await params

    // Get user's restaurant to verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId || user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch orders with enhanced details for restaurant operations
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: restaurantId
        // Include all orders, not just non-completed ones for table ordering view
      },
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
              include: {
                selections: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        },
        waiter: {
          select: {
            id: true,
            name: true
          }
        },
        cook: {
          select: {
            id: true,
            name: true
          }
        },
        server: {
          select: {
            id: true,
            name: true
          }
        },
        subOrders: {
          include: {
            items: {
              include: {
                menuItem: {
                  include: {
                    selections: {
                      include: {
                        options: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { orderedAt: 'desc' }
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId } = await params
    const body = await request.json()

    const { sessionId, tableId, customerName, totalAmount, notes, items } = body

    // Get user's restaurant to verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId || user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 })
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 })
    }

    // Always create a new order with a unique order number for each submission
    const orderCount = await prisma.order.count({
      where: { restaurantId: restaurantId }
    })
    const orderNumber = `ORD-${Date.now()}-${(orderCount + 1).toString().padStart(3, '0')}`

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId: restaurantId,
        sessionId: sessionId || null,
        tableId: tableId || null,
        customerName: customerName || null,
        totalAmount: parseFloat(totalAmount),
        notes: notes || null,
        waiterId: session.user.id,
        status: 'PENDING',
        items: {
          create: items.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
            notes: item.notes || null,
            selections: item.selectedOptions ? JSON.stringify(item.selectedOptions) : null
          }))
        }
      },
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
              include: {
                selections: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Update customer session status if provided
    if (sessionId) {
      await prisma.customerSession.update({
        where: { id: sessionId },
        data: { status: 'ORDERED' }
      })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
