import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId } = await params
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

    // Update menu item (verify ownership)
    const updatedItem = await prisma.menuItem.update({
      where: { 
        id: itemId,
        userId: session.user.id
      },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        categoryId,
        isActive: Boolean(isActive),
        isAvailable: Boolean(isAvailable)
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

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating menu item:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId } = await params


    // Check if menu item exists and belongs to user
    const menuItem = await prisma.menuItem.findUnique({
      where: { 
        id: itemId,
        userId: session.user.id
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    await prisma.menuItem.delete({
      where: { 
        id: itemId,
        userId: session.user.id
      }
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