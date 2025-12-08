import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        restaurantName: true
      }
    })
    
    return NextResponse.json({ 
      userExists: !!user,
      restaurantName: user?.restaurantName || null
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check user existence' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}