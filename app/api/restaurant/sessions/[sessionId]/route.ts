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
                menuItem: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
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

    return NextResponse.json(customerSession)
  } catch (error) {
    console.error('Error fetching session:', error)
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
    const { 
      customerName, 
      customerPhone, 
      customerEmail, 
      partySize, 
      status, 
      notes 
    } = body

    // Verify session exists and belongs to user
    const existingSession = await prisma.customerSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id 
      }
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update session
    const updatedSession = await prisma.customerSession.update({
      where: { id: sessionId },
      data: {
        customerName: customerName?.trim() || existingSession.customerName,
        customerPhone: customerPhone?.trim() || existingSession.customerPhone,
        customerEmail: customerEmail?.trim() || existingSession.customerEmail,
        partySize: partySize !== undefined ? Number(partySize) : existingSession.partySize,
        status: status || existingSession.status,
        notes: notes !== undefined ? notes : existingSession.notes,
        checkOutTime: status === 'COMPLETED' && !existingSession.checkOutTime 
          ? new Date() 
          : existingSession.checkOutTime
      },
      include: {
        table: true,
        orders: {
          include: {
            items: {
              include: {
                menuItem: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating session:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    // Verify session exists and belongs to user
    const existingSession = await prisma.customerSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id 
      },
      include: {
        _count: {
          select: { 
            orders: true,
            payments: true 
          }
        }
      }
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Don't allow deletion if there are orders or payments
    if (existingSession._count.orders > 0 || existingSession._count.payments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete session with existing orders or payments' },
        { status: 400 }
      )
    }

    // Delete session
    await prisma.customerSession.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({ message: 'Session deleted successfully' })
  } catch (error) {
    console.error('Error deleting session:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}