import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DELETE /api/restaurant/[id]/sessions/[sessionId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId, sessionId } = await params
    

    // Check if session exists and belongs to this user
    const customerSession = await prisma.customerSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, status: true }
    })

    if (!customerSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (customerSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow deletion of WAITING sessions
    if (customerSession.status !== 'WAITING') {
      return NextResponse.json({ error: 'Can only remove waiting customers' }, { status: 400 })
    }

    // Delete the session (verify ownership)
    await prisma.customerSession.delete({
      where: { 
        id: sessionId,
        userId: session.user.id
      }
    })

    return NextResponse.json({ message: 'Customer session removed successfully' })
  } catch (error) {
    console.error('Session deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to remove customer session' },
      { status: 500 }
    )
  }
}