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

    // Fetch menu items with category information for menu display
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: restaurantId,
        isActive: true // Only return active items for menu display
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
            description: true
          }
        },
        selections: {
          where: { menuItem: { isActive: true } },
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

    return NextResponse.json(transformedMenuItems)
  } catch (error) {
    console.error('Error fetching restaurant menu:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
