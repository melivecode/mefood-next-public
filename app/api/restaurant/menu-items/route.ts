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

    const menuItems = await prisma.menuItem.findMany({
      where: { userId: session.user.id },
      include: {
        category: true,
        selections: {
          include: {
            options: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(menuItems)
  } catch (error) {
    console.error('Error fetching menu items:', error)
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
    const { name, description, price, categoryId, image, isActive, isAvailable, sortOrder } = body

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Menu item name is required' },
        { status: 400 }
      )
    }

    if (!price || isNaN(parseFloat(price))) {
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

    // Create menu item
    const menuItem = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        categoryId,
        image: image?.trim() || null,
        isActive: Boolean(isActive ?? true),
        isAvailable: Boolean(isAvailable ?? true),
        sortOrder: Number(sortOrder) || 0,
        userId: session.user.id
      },
      include: {
        category: true,
        selections: {
          include: {
            options: true
          }
        }
      }
    })

    return NextResponse.json(menuItem, { status: 201 })
  } catch (error) {
    console.error('Error creating menu item:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}