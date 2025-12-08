import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/restaurant/[id]/menu-items/[itemId]/selections
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId } = await params


    // Verify menu item exists and belongs to user
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Get selections with options
    const selections = await prisma.selection.findMany({
      where: {
        menuItemId: itemId
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(selections)

  } catch (error) {
    console.error('Get selections error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch selections' },
      { status: 500 }
    )
  }
}

// POST /api/restaurant/[id]/menu-items/[itemId]/selections
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId } = await params


    // Verify menu item exists and belongs to user
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, isRequired, allowMultiple, options } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Selection name is required' }, { status: 400 })
    }

    // Get next sort order
    const lastSelection = await prisma.selection.findFirst({
      where: { menuItemId: itemId },
      orderBy: { sortOrder: 'desc' }
    })
    
    const sortOrder = (lastSelection?.sortOrder || 0) + 1

    // Create selection with options
    const selection = await prisma.selection.create({
      data: {
        name: name.trim(),
        isRequired: isRequired || false,
        allowMultiple: allowMultiple || false,
        sortOrder,
        menuItemId: itemId,
        options: {
          create: (options || []).map((option: any, index: number) => ({
            name: option.name.trim(),
            priceAdd: parseFloat(option.priceAdd || 0),
            isAvailable: option.isAvailable !== false,
            sortOrder: index
          }))
        }
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json(selection, { status: 201 })

  } catch (error) {
    console.error('Create selection error:', error)
    return NextResponse.json(
      { error: 'Failed to create selection' },
      { status: 500 }
    )
  }
}