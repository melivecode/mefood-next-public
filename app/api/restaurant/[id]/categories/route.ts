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

    // Fetch categories
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { menuItems: true }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
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
    const { name, description, isActive } = body


    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category name already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim()
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      )
    }

    // Get the next sort order
    const lastCategory = await prisma.category.findFirst({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'desc' }
    })

    const sortOrder = (lastCategory?.sortOrder || 0) + 1

    // Create category
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: Boolean(isActive),
        sortOrder,
        userId: session.user.id
      },
      include: {
        _count: {
          select: { menuItems: true }
        }
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}