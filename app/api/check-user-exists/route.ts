import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      include: {
        restaurant: true
      }
    })

    return NextResponse.json({
      userExists: !!user,
      restaurantName: user?.restaurant?.name || null
    })
  } catch (error) {
    console.error('Error checking user existence:', error)
    return NextResponse.json({ error: 'Failed to check user existence' }, { status: 500 })
  }
}
