import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        restaurant: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Return user with restaurant data in expected format
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurantName: user.restaurant?.name || null,
      restaurantDescription: user.restaurant?.description || null,
      restaurantAddress: user.restaurant?.address || null,
      restaurantPhone: user.restaurant?.phone || null,
      restaurantEmail: user.restaurant?.email || null,
      isRestaurantActive: user.restaurant?.isActive ?? true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update restaurant info
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update restaurant information' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      restaurantName,
      restaurantDescription,
      restaurantAddress,
      restaurantPhone,
      restaurantEmail,
      isRestaurantActive
    } = body

    const finalRestaurantName = restaurantName || body.name

    if (!finalRestaurantName?.trim()) {
      return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { restaurant: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user name if provided
    if (name !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: name?.trim() || null }
      })
    }

    // Update or create restaurant
    let restaurant
    if (user.restaurantId && user.restaurant) {
      restaurant = await prisma.restaurant.update({
        where: { id: user.restaurantId },
        data: {
          name: finalRestaurantName.trim(),
          description: restaurantDescription?.trim() || null,
          address: restaurantAddress?.trim() || null,
          phone: restaurantPhone?.trim() || null,
          email: restaurantEmail?.trim() || null,
          isActive: Boolean(isRestaurantActive ?? true)
        }
      })
    } else {
      // Create new restaurant and link to user
      restaurant = await prisma.restaurant.create({
        data: {
          name: finalRestaurantName.trim(),
          description: restaurantDescription?.trim() || null,
          address: restaurantAddress?.trim() || null,
          phone: restaurantPhone?.trim() || null,
          email: restaurantEmail?.trim() || null,
          isActive: Boolean(isRestaurantActive ?? true)
        }
      })
      await prisma.user.update({
        where: { id: session.user.id },
        data: { restaurantId: restaurant.id }
      })
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { restaurant: true }
    })

    return NextResponse.json({
      id: updatedUser!.id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      image: updatedUser!.image,
      role: updatedUser!.role,
      restaurantId: updatedUser!.restaurantId,
      restaurantName: updatedUser!.restaurant?.name || null,
      restaurantDescription: updatedUser!.restaurant?.description || null,
      restaurantAddress: updatedUser!.restaurant?.address || null,
      restaurantPhone: updatedUser!.restaurant?.phone || null,
      restaurantEmail: updatedUser!.restaurant?.email || null,
      isRestaurantActive: updatedUser!.restaurant?.isActive ?? true,
      createdAt: updatedUser!.createdAt,
      updatedAt: updatedUser!.updatedAt
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
