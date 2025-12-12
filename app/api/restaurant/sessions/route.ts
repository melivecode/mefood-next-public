import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's restaurant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Get all customer sessions for the current user's restaurant
    const customerSessions = await prisma.customerSession.findMany({
      where: {
        restaurantId: user.restaurantId
      },
      include: {
        table: true,
        orders: {
          include: {
            items: true
          }
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    })

    return NextResponse.json(customerSessions)

  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's restaurant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const body = await request.json()
    const { customerName, customerPhone, customerEmail, partySize, notes } = body

    // Create new customer session
    const newSession = await prisma.customerSession.create({
      data: {
        customerName,
        customerPhone,
        customerEmail,
        partySize: parseInt(partySize),
        notes,
        status: 'WAITING',
        restaurantId: user.restaurantId
      },
      include: {
        table: true
      }
    })

    return NextResponse.json(newSession, { status: 201 })

  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}