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

    const { id: _ } = await params


    // Fetch menu items with category data
    const menuItems = await prisma.menuItem.findMany({
      where: { 
        userId: session.user.id,
        category: {
          isActive: true // Only include items with active categories
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        selections: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Transform the data to ensure consistency
    const transformedMenuItems = menuItems.map(item => ({
      ...item,
      price: Number(item.price),
      // Ensure category is always present
      category: item.category || {
        id: 'unknown',
        name: 'Uncategorized',
        description: null
      },
      selections: item.selections?.map(selection => ({
        ...selection,
        options: selection.options?.map(option => ({
          ...option,
          priceAdd: Number(option.priceAdd)
        }))
      }))
    }))

    return NextResponse.json(transformedMenuItems)
  } catch (error) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const { id: _ } = await params
    const body = await request.json()
    const { name, description, price, categoryId, isActive, isAvailable } = body



    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Menu item name is required' },
        { status: 400 }
      )
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      )
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // Verify category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: session.user.id
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Get the next sort order
    const lastItem = await prisma.menuItem.findFirst({
      where: { categoryId },
      orderBy: { sortOrder: 'desc' }
    })

    const sortOrder = (lastItem?.sortOrder || 0) + 1

    // Create menu item
    const menuItem = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        categoryId,
        userId: session.user.id,
        isActive: Boolean(isActive),
        isAvailable: Boolean(isAvailable),
        sortOrder
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(menuItem)
  } catch (error) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}