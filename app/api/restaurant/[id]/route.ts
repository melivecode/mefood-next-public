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

    // Fetch restaurant details from User model
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        restaurantName: true,
        restaurantDescription: true,
        restaurantAddress: true,
        restaurantPhone: true,
        restaurantEmail: true,
        isRestaurantActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Transform to match expected restaurant format
    const restaurant = {
      id: user.id,
      name: user.restaurantName,
      description: user.restaurantDescription,
      address: user.restaurantAddress,
      phone: user.restaurantPhone,
      email: user.restaurantEmail,
      isActive: user.isRestaurantActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
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
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, address, phone, email, isActive } = body


    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      )
    }

    // Update restaurant data in User model
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        restaurantName: name.trim(),
        restaurantDescription: description?.trim() || null,
        restaurantAddress: address?.trim() || null,
        restaurantPhone: phone?.trim() || null,
        restaurantEmail: email?.trim() || null,
        isRestaurantActive: Boolean(isActive)
      },
      select: {
        id: true,
        restaurantName: true,
        restaurantDescription: true,
        restaurantAddress: true,
        restaurantPhone: true,
        restaurantEmail: true,
        isRestaurantActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Transform to match expected restaurant format
    const restaurant = {
      id: updatedUser.id,
      name: updatedUser.restaurantName,
      description: updatedUser.restaurantDescription,
      address: updatedUser.restaurantAddress,
      phone: updatedUser.restaurantPhone,
      email: updatedUser.restaurantEmail,
      isActive: updatedUser.isRestaurantActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    }

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