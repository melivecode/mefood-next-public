import { NextResponse } from 'next/server'
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

    // All operations are automatically scoped to the authenticated user
    const menuItems = await prisma.menuItem.findMany({
      where: { 
        userId: session.user.id,
        isActive: true
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
        }
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { sortOrder: 'asc' }
      ]
    })

    // Group items by category
    const groupedMenu = menuItems.reduce((acc, item) => {
      const categoryName = item.category.name
      if (!acc[categoryName]) {
        acc[categoryName] = {
          id: item.category.id,
          name: categoryName,
          items: []
        }
      }
      acc[categoryName].items.push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        isAvailable: item.isAvailable
      })
      return acc
    }, {} as any)

    return NextResponse.json({
      categories: Object.values(groupedMenu)
    })

  } catch (error) {
    console.error('Error fetching menu:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}