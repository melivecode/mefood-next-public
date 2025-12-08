import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params

    // Verify user restaurant exists and is active
    const user = await prisma.user.findUnique({
      where: { id: restaurantId },
      select: { id: true, isRestaurantActive: true, restaurantName: true }
    })

    if (!user || !user.restaurantName) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    if (!user.isRestaurantActive) {
      return NextResponse.json({ error: 'Restaurant is not active' }, { status: 403 })
    }

    // Fetch categories that have active menu items
    const categories = await prisma.category.findMany({
      where: { 
        userId: restaurantId,
        isActive: true,
        menuItems: {
          some: {
            isActive: true,
            isAvailable: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        sortOrder: true
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(categories.map(cat => ({
      ...cat,
      displayOrder: cat.sortOrder
    })))
  } catch (error) {
    console.error('Error fetching public categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}