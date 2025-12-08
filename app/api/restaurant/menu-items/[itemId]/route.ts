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

    const menuItem = await prisma.menuItem.findFirst({
      where: { 
        id: itemId,
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

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    return NextResponse.json(menuItem)
  } catch (error) {
    console.error('Error fetching menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { name, description, price, categoryId, image, isActive, isAvailable, sortOrder } = body

    // Verify menu item exists and belongs to user
    const existingItem = await prisma.menuItem.findFirst({
      where: { 
        id: itemId,
        userId: session.user.id 
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

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

    // Update menu item
    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        categoryId,
        image: image?.trim() || null,
        isActive: Boolean(isActive ?? true),
        isAvailable: Boolean(isAvailable ?? true),
        sortOrder: Number(sortOrder) || 0
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

    return NextResponse.json(updatedMenuItem)
  } catch (error) {
    console.error('Error updating menu item:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const existingItem = await prisma.menuItem.findFirst({
      where: { 
        id: itemId,
        userId: session.user.id 
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Delete menu item (selections and options will be cascade deleted)
    await prisma.menuItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({ message: 'Menu item deleted successfully' })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}