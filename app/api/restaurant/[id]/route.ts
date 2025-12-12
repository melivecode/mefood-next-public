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

    const { id: restaurantId } = await params

    // Get user's restaurant to verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId || user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch restaurant details from Restaurant model
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error('Error fetching restaurant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId } = await params
    const body = await request.json()
    const { name, description, address, phone, email, isActive } = body

    // Get user's restaurant to verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!user?.restaurantId || user.restaurantId !== restaurantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      )
    }

    // Update restaurant data in Restaurant model
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        isActive: Boolean(isActive)
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error('Error updating restaurant:', error)

    if (error instanceof Error) {
      // Handle Prisma errors
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A restaurant with this name already exists' },
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
