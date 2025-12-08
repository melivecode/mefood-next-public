import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    

    const customerSessions = await prisma.customerSession.findMany({
      where: { 
        userId: session.user.id,
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
        userId: session.user.id,
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