import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId } = await params

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

    const selections = await prisma.selection.findMany({
      where: { menuItemId: itemId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(selections)
  } catch (error) {
    console.error('Error fetching selections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId } = await params
    const body = await request.json()
    const { name, description, isRequired, allowMultiple, sortOrder, options } = body

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

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Selection name is required' },
        { status: 400 }
      )
    }

    // Create selection with options
    const selection = await prisma.selection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isRequired: Boolean(isRequired ?? false),
        allowMultiple: Boolean(allowMultiple ?? false),
        sortOrder: Number(sortOrder) || 0,
        menuItemId: itemId,
        options: {
          create: (options || []).map((option: any, index: number) => ({
            name: option.name.trim(),
            description: option.description?.trim() || null,
            priceAdd: parseFloat(option.priceAdd) || 0,
            isAvailable: Boolean(option.isAvailable ?? true),
            sortOrder: Number(option.sortOrder) || index
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
    console.error('Error creating selection:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}