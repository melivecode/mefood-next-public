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

    // Get user's restaurant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Get existing payment for this session
    const payment = await prisma.payment.findFirst({
      where: {
        sessionId,
        restaurantId: user.restaurantId
      },
      include: {
        items: true
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json(payment)

  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const {
      paymentMethod,
      subtotalAmount,
      discountAmount,
      extraChargesAmount,
      finalAmount,
      receivedAmount,
      changeAmount,
      notes,
      extraCharges,
      orderIds // Array of order IDs to include in this payment
    } = body

    // Validate payment method
    const validPaymentMethods = ['CASH', 'QR', 'CREDIT_CARD', 'DEBIT_CARD']
    const normalizedPaymentMethod = paymentMethod?.toUpperCase() || 'CASH'

    if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
      return NextResponse.json(
        { error: `Invalid payment method. Valid options: ${validPaymentMethods.join(', ')}` },
        { status: 400 }
      )
    }

    // Get user's restaurant with details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { restaurant: true }
    })

    if (!user?.restaurantId || !user.restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Verify customer session exists and belongs to restaurant
    const customerSession = await prisma.customerSession.findFirst({
      where: {
        id: sessionId,
        restaurantId: user.restaurantId
      },
      include: {
        table: true,
        orders: {
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
        }
      }
    })

    if (!customerSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Generate payment number
    const paymentCount = await prisma.payment.count({
      where: { restaurantId: user.restaurantId }
    })
    const paymentNumber = `PAY${String(paymentCount + 1).padStart(6, '0')}`

    // Create payment with snapshot data
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,

        // Connect to existing relations
        session: {
          connect: { id: sessionId }
        },
        restaurant: {
          connect: { id: user.restaurantId }
        },

        // Session and table snapshot data
        customerName: customerSession.customerName,
        customerPhone: customerSession.customerPhone,
        customerEmail: customerSession.customerEmail,
        partySize: customerSession.partySize,
        tableNumber: customerSession.table?.number || '',
        tableName: customerSession.table?.name,
        checkInTime: customerSession.checkInTime,
        checkOutTime: customerSession.checkOutTime || new Date(),

        // Restaurant snapshot data
        restaurantName: user.restaurant.name || '',
        restaurantAddress: user.restaurant.address,
        restaurantPhone: user.restaurant.phone,

        // Payment details
        paymentMethod: normalizedPaymentMethod,
        subtotalAmount: Number(subtotalAmount) || 0,
        discountAmount: Number(discountAmount) || 0,
        extraChargesAmount: Number(extraChargesAmount) || 0,
        finalAmount: Number(finalAmount) || 0,
        receivedAmount: receivedAmount ? Number(receivedAmount) : null,
        changeAmount: changeAmount ? Number(changeAmount) : null,
        notes: notes?.trim() || null,
        extraCharges: extraCharges || null,

        // Create payment items from specified orders only (or all orders if no orderIds provided)
        items: {
          create: customerSession.orders
            .filter(order => !orderIds || orderIds.length === 0 || orderIds.includes(order.id))
            .flatMap(order =>
              order.items.map(item => ({
                // Menu item snapshot data
                menuItemName: item.menuItem.name,
                menuItemDescription: item.menuItem.description,
                menuItemPrice: Number(item.menuItem.price),
                categoryName: item.menuItem.category.name,

                // Order item data
                quantity: item.quantity,
                unitPrice: Number(item.price),
                totalPrice: Number(item.price) * item.quantity,
                notes: item.notes,
                selections: item.selections as any
              }))
            )
        }
      },
      include: {
        items: true,
        session: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    const response = {
      success: true,
      id: payment.id,
      paymentId: payment.id,
      payment_id: payment.id,
      data: payment
    }
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Error creating payment:', error)
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
  // PUT now always creates a new payment (same as POST)
  // This allows multiple payments per session (split billing)
  return await POST(request, { params })
}
