import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user session
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has restaurant information
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantName: true }
    })

    if (existingUser?.restaurantName) {
      return NextResponse.json(
        { error: 'User already has a restaurant configured' },
        { status: 409 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, description, address, phone, email, isActive } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      )
    }

    // Update the user with restaurant information
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        restaurantName: name.trim(),
        restaurantDescription: description?.trim() || null,
        restaurantAddress: address?.trim() || null,
        restaurantPhone: phone?.trim() || null,
        restaurantEmail: email?.trim() || null,
        isRestaurantActive: typeof isActive === 'boolean' ? isActive : true,
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

    // Return the created restaurant
    return NextResponse.json(restaurant, { status: 201 })

  } catch (error) {
    console.error('Error creating restaurant:', error)
    
    // Handle Prisma unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A restaurant with this information already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  try {
    // Get the authenticated user session
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the current user's restaurant information
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

    if (!user || !user.restaurantName) {
      return NextResponse.json([])
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

    return NextResponse.json([restaurant])

  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}