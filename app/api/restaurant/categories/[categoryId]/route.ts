import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categoryId } = await params

    const category = await prisma.category.findFirst({
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

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categoryId } = await params
    const body = await request.json()
    const { name, description, isActive, sortOrder } = body

    // Verify category exists and belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: { 
        id: categoryId,
        userId: session.user.id 
      }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: Boolean(isActive ?? true),
        sortOrder: Number(sortOrder) || 0
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
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categoryId } = await params

    // Verify category exists and belongs to user
    const existingCategory = await prisma.category.findFirst({
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

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has menu items
    if (existingCategory._count.menuItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category that contains menu items' },
        { status: 400 }
      )
    }

    // Delete category
    await prisma.category.delete({
      where: { id: categoryId }
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