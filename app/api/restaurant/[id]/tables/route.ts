import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/restaurant/[id]/tables
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
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

    // Get all tables for the restaurant
    const tables = await prisma.table.findMany({
      where: {
        restaurantId: restaurantId
      },
      orderBy: [
        { sortOrder: 'asc' },
        { number: 'asc' }
      ]
    })

    return NextResponse.json(tables)

  } catch (error) {
    console.error('Get tables error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}

// POST /api/restaurant/[id]/tables
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
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

    const body = await request.json()
    const { number, name, capacity, isActive, gridX, gridY, gridWidth, gridHeight, sortOrder } = body

    if (!number || !number.trim()) {
      return NextResponse.json({ error: 'Table number is required' }, { status: 400 })
    }

    if (!capacity || capacity < 1) {
      return NextResponse.json({ error: 'Valid capacity is required' }, { status: 400 })
    }

    // Check if table number already exists for this restaurant
    const existingTable = await prisma.table.findUnique({
      where: {
        restaurantId_number: {
          restaurantId: restaurantId,
          number: number.trim()
        }
      }
    })

    if (existingTable) {
      return NextResponse.json({ error: 'Table number already exists' }, { status: 400 })
    }

    // Get the next sort order if not provided
    let tableSortOrder = sortOrder
    if (tableSortOrder === undefined) {
      const maxSortOrder = await prisma.table.findFirst({
        where: { restaurantId: restaurantId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true }
      })
      tableSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1
    }

    // Create table with optional grid position
    const table = await prisma.table.create({
      data: {
        number: number.trim(),
        name: name?.trim() || null,
        capacity: parseInt(capacity),
        isActive: isActive !== false,
        sortOrder: tableSortOrder,
        gridX: gridX ?? 0,
        gridY: gridY ?? 0,
        gridWidth: gridWidth ?? 2,
        gridHeight: gridHeight ?? 2,
        restaurantId: restaurantId
      }
    })

    return NextResponse.json(table, { status: 201 })

  } catch (error) {
    console.error('Create table error:', error)
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    )
  }
}
