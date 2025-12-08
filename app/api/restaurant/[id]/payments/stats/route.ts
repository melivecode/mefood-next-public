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

    // Get user restaurant info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, restaurantName: true }
    })

    if (!user || !user.restaurantName) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Get total revenue and payment count
    const revenueResult = await prisma.payment.aggregate({
      where: { userId: session.user.id },
      _sum: { finalAmount: true },
      _count: { id: true },
      _avg: { finalAmount: true }
    })

    // Get payment method breakdown
    const paymentMethodBreakdown = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: { userId: session.user.id },
      _count: { id: true },
      _sum: { finalAmount: true }
    })

    const stats = {
      totalRevenue: revenueResult._sum.finalAmount || 0,
      totalPayments: revenueResult._count.id || 0,
      averageOrderValue: revenueResult._avg.finalAmount || 0,
      paymentMethodBreakdown: paymentMethodBreakdown.map(item => ({
        method: item.paymentMethod,
        count: item._count.id,
        total: item._sum.finalAmount || 0
      }))
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching payment stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}