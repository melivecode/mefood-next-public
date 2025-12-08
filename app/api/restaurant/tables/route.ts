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

    // Get all tables for the current user
    const tables = await prisma.table.findMany({
      where: { 
        userId: session.user.id,
        isActive: true
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    return NextResponse.json(tables)

  } catch (error) {
    console.error('Error fetching tables:', error)
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
    const { number, name, capacity, isActive, sortOrder, gridX, gridY, gridWidth, gridHeight } = body

    // Validate required fields
    if (!number || number.trim().length === 0) {
      return NextResponse.json(
        { error: 'Table number is required' },
        { status: 400 }
      )
    }

    // Check if table number already exists for this user
    const existingTable = await prisma.table.findFirst({
      where: {
        userId: session.user.id,
        number: number.trim()
      }
    })

    if (existingTable) {
      return NextResponse.json(
        { error: 'A table with this number already exists' },
        { status: 400 }
      )
    }

    // Create the table
    const table = await prisma.table.create({
      data: {
        number: number.trim(),
        name: name?.trim() || null,
        capacity: Number(capacity) || 4,
        isActive: Boolean(isActive ?? true),
        sortOrder: Number(sortOrder) || 0,
        gridX: Number(gridX) || 0,
        gridY: Number(gridY) || 0,
        gridWidth: Number(gridWidth) || 2,
        gridHeight: Number(gridHeight) || 2,
        userId: session.user.id
      }
    })

    return NextResponse.json(table, { status: 201 })

  } catch (error) {
    console.error('Error creating table:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A table with this number already exists' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}