import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params

    // Fetch restaurant info
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        email: true,
        isActive: true
      }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    if (!restaurant.isActive) {
      return NextResponse.json({ error: 'Restaurant is not active' }, { status: 403 })
    }

    // Fetch menu items with category information for public menu display
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isActive: true,
        isAvailable: true // Only show available items to public
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        isAvailable: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            sortOrder: true
          }
        },
        selections: {
          select: {
            id: true,
            name: true,
            description: true,
            isRequired: true,
            allowMultiple: true,
            options: {
              where: { isAvailable: true },
              select: {
                id: true,
                name: true,
                description: true,
                priceAdd: true
              },
              orderBy: { sortOrder: 'asc' }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Transform the data to include imageUrl field and convert price to number
    const transformedMenuItems = menuItems.map(item => ({
      ...item,
      price: Number(item.price),
      imageUrl: item.image,
      available: item.isAvailable,
      selections: item.selections?.map(selection => ({
        ...selection,
        options: selection.options?.map(option => ({
          ...option,
          priceAdd: Number(option.priceAdd)
        }))
      }))
    }))

    return NextResponse.json({
      restaurant,
      menuItems: transformedMenuItems
    })
  } catch (error) {
    console.error('Error fetching public menu:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
