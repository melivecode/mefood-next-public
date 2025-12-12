import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params

    // Verify restaurant exists and is active
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true, name: true }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    if (!restaurant.isActive) {
      return NextResponse.json({ error: 'Restaurant is not active' }, { status: 403 })
    }

    // Fetch categories that have active menu items
    const categories = await prisma.category.findMany({
      where: {
        restaurantId,
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
