// Payment processing API - records payment but doesn't checkout customer
// Customer stays at table and can continue ordering after payment

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient, PaymentMethod } from '@prisma/client'

const prisma = new PrismaClient()

interface ExtraCharge {
  id: string
  description: string
  amount: number
  isPercentage: boolean
}

interface PaymentData {
  paymentMethod: string
  totalAmount: number
  extraCharges: ExtraCharge[]
  discountAmount: number
  finalAmount: number
  receivedAmount?: number
  changeAmount?: number
  notes?: string
}

// Generate unique payment number
function generatePaymentNumber(restaurantId: string): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const restaurantPrefix = restaurantId.slice(-4).toUpperCase()
  return `${restaurantPrefix}-${timestamp}-${random}`
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId, sessionId } = await params
    const paymentData: PaymentData = await request.json()
    

    // Get session details with all related data for snapshot
    const customerSession = await prisma.customerSession.findUnique({
      where: { 
        id: sessionId,
        userId: session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            restaurantName: true,
            restaurantAddress: true,
            restaurantPhone: true
          }
        },
        table: {
          select: {
            id: true,
            number: true,
            name: true
          }
        },
        orders: {
          include: {
            items: {
              include: {
                menuItem: {
                  include: {
                    category: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!customerSession) {
      return NextResponse.json({ error: 'Customer session not found' }, { status: 404 })
    }

    const paymentTime = new Date()
    const paymentNumber = generatePaymentNumber(restaurantId)
    
    // Calculate extra charges total
    const extraChargesAmount = paymentData.extraCharges.reduce((total, charge) => {
      if (charge.isPercentage) {
        return total + (paymentData.totalAmount * charge.amount / 100)
      }
      return total + charge.amount
    }, 0)

    // Create payment record with all snapshot data
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        sessionId,
        userId: session.user.id,
        
        // Session snapshot
        customerName: customerSession.customerName,
        customerPhone: customerSession.customerPhone,
        customerEmail: customerSession.customerEmail,
        partySize: customerSession.partySize,
        tableNumber: customerSession.table?.number || 'N/A',
        tableName: customerSession.table?.name,
        checkInTime: customerSession.checkInTime,
        checkOutTime: paymentTime, // Use payment time for now, can update when customer actually leaves
        
        // Restaurant snapshot
        restaurantName: customerSession.user.restaurantName || 'Restaurant',
        restaurantAddress: customerSession.user.restaurantAddress || '',
        restaurantPhone: customerSession.user.restaurantPhone || '',
        
        // Payment details
        paymentMethod: paymentData.paymentMethod.toUpperCase() as PaymentMethod,
        subtotalAmount: paymentData.totalAmount,
        discountAmount: paymentData.discountAmount,
        extraChargesAmount,
        finalAmount: paymentData.finalAmount,
        receivedAmount: paymentData.receivedAmount,
        changeAmount: paymentData.changeAmount,
        notes: paymentData.notes,
        extraCharges: paymentData.extraCharges as any,
        
        // Create payment items with snapshot data
        items: {
          create: customerSession.orders.flatMap(order =>
            order.items.map(item => ({
              menuItemName: item.menuItem.name,
              menuItemDescription: item.menuItem.description,
              menuItemPrice: item.menuItem.price,
              categoryName: item.menuItem.category.name,
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.price.mul(item.quantity),
              notes: item.notes,
              selections: item.selections as any,
            }))
          )
        }
      },
      include: {
        items: true
      }
    })

    // Update the customer session to BILLING status (not COMPLETED yet)
    // Customer can stay at table after payment
    const updatedSession = await prisma.customerSession.update({
      where: { 
        id: sessionId,
        userId: session.user.id
      },
      data: {
        status: 'BILLING' // Keep as BILLING, don't complete yet
        // Don't set checkOutTime - customer hasn't left yet
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            restaurantName: true,
            restaurantAddress: true,
            restaurantPhone: true
          }
        }
      }
    })

    return NextResponse.json({
      session: updatedSession,
      payment: payment,
      paymentNumber: paymentNumber
    })
  } catch (error) {
    console.error('Complete session error:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Customer session not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to complete customer session' },
      { status: 500 }
    )
  }
}