import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const customerSessions = await prisma.customerSession.findMany({
      where: {
        restaurantId: restaurantId,
        status: {
          not: 'COMPLETED'
        }
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            name: true
          }
        }
      },
      orderBy: { checkInTime: 'desc' }
    })

    return NextResponse.json(customerSessions)
  } catch (error) {
    console.error('Sessions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer sessions' },
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

    const { customerName, customerPhone, customerEmail, partySize, notes } = body

    // Get user's restaurant to verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId || user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!partySize || partySize < 1) {
      return NextResponse.json({ error: 'Party size is required' }, { status: 400 })
    }

    const customerSession = await prisma.customerSession.create({
      data: {
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        partySize: parseInt(partySize),
        notes: notes || null,
        restaurantId: restaurantId,
        status: 'WAITING'
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

    return NextResponse.json(customerSession)
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create customer session' },
      { status: 500 }
    )
  }
}
