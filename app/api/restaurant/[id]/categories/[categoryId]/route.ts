import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, categoryId } = await params
    const body = await request.json()
    const { name, description, isActive } = body


    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category name already exists (excluding current category)
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim(),
        id: { not: categoryId }
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      )
    }

    // Update category (verify ownership)
    const updatedCategory = await prisma.category.update({
      where: { 
        id: categoryId,
        userId: session.user.id
      },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: Boolean(isActive)
      },
      include: {
        _count: {
          select: { menuItems: true }
        }
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, categoryId } = await params


    // Check if category has menu items (verify ownership)
    const category = await prisma.category.findUnique({
      where: { 
        id: categoryId,
        userId: session.user.id
      },
      include: {
        _count: {
          select: { menuItems: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category._count.menuItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with menu items' }, 
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { 
        id: categoryId,
        userId: session.user.id
      }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}