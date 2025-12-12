import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has a restaurant
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { restaurant: true }
    })

    if (existingUser?.restaurant) {
      return NextResponse.json(
        { error: 'User already has a restaurant configured' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { name, description, address, phone, email, isActive } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      )
    }

    // Create restaurant and link to user
    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          isActive: typeof isActive === 'boolean' ? isActive : true,
        }
      })

      await tx.user.update({
        where: { id: session.user.id },
        data: { restaurantId: restaurant.id }
      })

      return restaurant
    })

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Error creating restaurant:', error)

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
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { restaurant: true }
    })

    if (!user?.restaurant) {
      return NextResponse.json([])
    }

    return NextResponse.json([user.restaurant])

  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
