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

    // Get existing payment for this session
    const payment = await prisma.payment.findFirst({
      where: { 
        sessionId,
        userId: session.user.id
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
      extraCharges
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

    // Verify customer session exists and belongs to user
    const customerSession = await prisma.customerSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id 
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

    // Get user/restaurant data for snapshot
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        restaurantName: true,
        restaurantAddress: true,
        restaurantPhone: true
      }
    })

    // Generate payment number
    const paymentCount = await prisma.payment.count({
      where: { userId: session.user.id }
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
        user: {
          connect: { id: session.user.id }
        },
        
        // Session and table snapshot data
        customerName: customerSession.customerName,
        customerPhone: customerSession.customerPhone,
        customerEmail: customerSession.customerEmail,
        partySize: customerSession.partySize,
        tableNumber: customerSession.table?.number || '',
        tableName: customerSession.table?.name,
        checkInTime: customerSession.checkInTime,
        checkOutTime: customerSession.checkOutTime || new Date(), // Use current time as payment time if no actual checkout
        
        // Restaurant snapshot data
        restaurantName: user?.restaurantName || '',
        restaurantAddress: user?.restaurantAddress,
        restaurantPhone: user?.restaurantPhone,
        
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
        
        // Create payment items from session orders
        items: {
          create: customerSession.orders.flatMap(order =>
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

    // Note: We don't automatically check out the customer when payment is made
    // The customer can continue ordering after payment
    // Session status and checkout should be handled separately by staff

    // Ensure the response includes the payment ID
    // Return a more explicit response format with multiple ID references
    const response = {
      success: true,
      id: payment.id,
      paymentId: payment.id,
      payment_id: payment.id, // Additional format variations
      data: payment
    }
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
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
    const body = await request.json()
    const { paymentId: _, ...updateData } = body

    // Validate payment method if provided
    if (updateData.paymentMethod) {
      const validPaymentMethods = ['CASH', 'QR', 'CREDIT_CARD', 'DEBIT_CARD']
      const normalizedPaymentMethod = updateData.paymentMethod?.toUpperCase()
      
      if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
        return NextResponse.json(
          { error: `Invalid payment method. Valid options: ${validPaymentMethods.join(', ')}` },
          { status: 400 }
        )
      }
      
      updateData.paymentMethod = normalizedPaymentMethod
    }

    // Check if payment exists and belongs to user
    const existingPayment = await prisma.payment.findFirst({
      where: { 
        sessionId,
        userId: session.user.id
      }
    })

    if (!existingPayment) {
      // If no payment exists, create a new one with the provided data
      // Forward to POST method logic
      const postRequest = new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify(updateData),
        headers: request.headers
      })
      
      // Call POST method to create the payment
      return await POST(postRequest, { params })
    }

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        paymentMethod: updateData.paymentMethod || existingPayment.paymentMethod,
        subtotalAmount: updateData.subtotalAmount !== undefined ? Number(updateData.subtotalAmount) : existingPayment.subtotalAmount,
        discountAmount: updateData.discountAmount !== undefined ? Number(updateData.discountAmount) : existingPayment.discountAmount,
        extraChargesAmount: updateData.extraChargesAmount !== undefined ? Number(updateData.extraChargesAmount) : existingPayment.extraChargesAmount,
        finalAmount: updateData.finalAmount !== undefined ? Number(updateData.finalAmount) : existingPayment.finalAmount,
        receivedAmount: updateData.receivedAmount !== undefined ? (updateData.receivedAmount ? Number(updateData.receivedAmount) : null) : existingPayment.receivedAmount,
        changeAmount: updateData.changeAmount !== undefined ? (updateData.changeAmount ? Number(updateData.changeAmount) : null) : existingPayment.changeAmount,
        notes: updateData.notes !== undefined ? updateData.notes?.trim() || null : existingPayment.notes,
        extraCharges: updateData.extraCharges !== undefined ? JSON.stringify(updateData.extraCharges) : (existingPayment.extraCharges as any)
      },
      include: {
        items: true
      }
    })

    // Return response with explicit paymentId field
    const response = {
      success: true,
      id: updatedPayment.id,
      paymentId: updatedPayment.id,
      payment_id: updatedPayment.id,
      data: updatedPayment
    }
    
    return NextResponse.json(response)

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}