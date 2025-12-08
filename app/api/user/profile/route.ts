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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        ownerName: true,
        ownerImage: true,
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)

  } catch (error) {
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

    const body = await request.json()
    const {
      ownerName,
      restaurantName,
      restaurantDescription,
      restaurantAddress,
      restaurantPhone,
      restaurantEmail,
      isRestaurantActive
    } = body

    // Validate required fields
    if (!restaurantName?.trim()) {
      return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ownerName: ownerName?.trim() || null,
        restaurantName: restaurantName.trim(),
        restaurantDescription: restaurantDescription?.trim() || null,
        restaurantAddress: restaurantAddress?.trim() || null,
        restaurantPhone: restaurantPhone?.trim() || null,
        restaurantEmail: restaurantEmail?.trim() || null,
        isRestaurantActive: Boolean(isRestaurantActive)
      },
      select: {
        id: true,
        email: true,
        ownerName: true,
        ownerImage: true,
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

    return NextResponse.json(updatedUser)

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}