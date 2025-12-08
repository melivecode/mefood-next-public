import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    const { tableId } = body

    // Verify customer session exists and belongs to user
    const customerSession = await prisma.customerSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id 
      },
      include: {
        table: true
      }
    })

    if (!customerSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // If tableId is provided, verify table exists and belongs to user
    if (tableId) {
      const table = await prisma.table.findFirst({
        where: { 
          id: tableId,
          userId: session.user.id,
          isActive: true
        }
      })

      if (!table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 })
      }

      // Check if table is already occupied by another active session
      const existingSession = await prisma.customerSession.findFirst({
        where: {
          tableId,
          id: { not: sessionId },
          status: {
            in: ['SEATED', 'ORDERING', 'ORDERED', 'SERVING', 'DINING', 'BILLING']
          }
        }
      })

      if (existingSession) {
        return NextResponse.json(
          { error: 'Table is already occupied' },
          { status: 400 }
        )
      }
    }

    // Update customer session with table assignment
    const updatedSession = await prisma.customerSession.update({
      where: { id: sessionId },
      data: {
        tableId: tableId || null,
        status: tableId ? 'SEATED' : customerSession.status,
        seatedTime: tableId && !customerSession.seatedTime ? new Date() : customerSession.seatedTime
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
    console.error('Error assigning table to session:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}