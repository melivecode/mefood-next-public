import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT /api/restaurant/[id]/sessions/[sessionId]/checkout
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
    

    // Check if session exists and belongs to this user
    const customerSession = await prisma.customerSession.findUnique({
      where: { 
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!customerSession) {
      return NextResponse.json({ error: 'Customer session not found' }, { status: 404 })
    }

    // Update the customer session to completed and set checkout time
    const updatedSession = await prisma.customerSession.update({
      where: { 
        id: sessionId,
        userId: session.user.id
      },
      data: {
        status: 'COMPLETED',
        checkOutTime: new Date()
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Checkout session error:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Customer session not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to checkout customer session' },
      { status: 500 }
    )
  }
}