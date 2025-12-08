import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all customer sessions for the current user's restaurant
    const customerSessions = await prisma.customerSession.findMany({
      where: { 
        userId: session.user.id
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
        userId: session.user.id
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