import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tableId } = await params
    const body = await request.json()
    const { gridX, gridY, gridWidth, gridHeight } = body

    // Verify table exists and belongs to user
    const existingTable = await prisma.table.findFirst({
      where: { 
        id: tableId,
        userId: session.user.id 
      }
    })

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Validate grid values
    if (gridX === undefined || gridY === undefined) {
      return NextResponse.json(
        { error: 'Grid position (gridX, gridY) is required' },
        { status: 400 }
      )
    }

    // Update table position
    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: {
        gridX: Number(gridX) || 0,
        gridY: Number(gridY) || 0,
        gridWidth: Number(gridWidth) || 2,
        gridHeight: Number(gridHeight) || 2
      }
    })

    return NextResponse.json(updatedTable)
  } catch (error) {
    console.error('Error updating table position:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}