import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params

    const payment = await prisma.payment.findFirst({
      where: { 
        id: paymentId,
        userId: session.user.id 
      },
      include: {
        items: true,
        session: {
          include: {
            table: true
          }
        }
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params
    const body = await request.json()

    // Verify payment exists and belongs to user
    const existingPayment = await prisma.payment.findFirst({
      where: { 
        id: paymentId,
        userId: session.user.id 
      }
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Validate payment method if provided
    if (body.paymentMethod) {
      const validPaymentMethods = ['CASH', 'QR', 'CREDIT_CARD', 'DEBIT_CARD']
      const normalizedPaymentMethod = body.paymentMethod?.toUpperCase()
      
      if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
        return NextResponse.json(
          { error: `Invalid payment method. Valid options: ${validPaymentMethods.join(', ')}` },
          { status: 400 }
        )
      }
      
      body.paymentMethod = normalizedPaymentMethod
    }

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentMethod: body.paymentMethod || existingPayment.paymentMethod,
        subtotalAmount: body.subtotalAmount !== undefined ? Number(body.subtotalAmount) : existingPayment.subtotalAmount,
        discountAmount: body.discountAmount !== undefined ? Number(body.discountAmount) : existingPayment.discountAmount,
        extraChargesAmount: body.extraChargesAmount !== undefined ? Number(body.extraChargesAmount) : existingPayment.extraChargesAmount,
        finalAmount: body.finalAmount !== undefined ? Number(body.finalAmount) : existingPayment.finalAmount,
        receivedAmount: body.receivedAmount !== undefined ? (body.receivedAmount ? Number(body.receivedAmount) : null) : existingPayment.receivedAmount,
        changeAmount: body.changeAmount !== undefined ? (body.changeAmount ? Number(body.changeAmount) : null) : existingPayment.changeAmount,
        notes: body.notes !== undefined ? body.notes?.trim() || null : existingPayment.notes,
        extraCharges: body.extraCharges !== undefined ? JSON.stringify(body.extraCharges) : (existingPayment.extraCharges as any)
      },
      include: {
        items: true,
        session: {
          include: {
            table: true
          }
        }
      }
    })

    return NextResponse.json(updatedPayment)
  } catch (error) {
    console.error('Error updating payment:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}