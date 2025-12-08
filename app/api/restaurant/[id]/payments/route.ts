import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/restaurant/[id]/payments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _ } = await params
    const { searchParams } = new URL(request.url)
    

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const paymentMethod = searchParams.get('paymentMethod')
    const searchTerm = searchParams.get('search')
    const sessionId = searchParams.get('sessionId')
    
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    }

    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod.toUpperCase()
    }

    if (sessionId) {
      where.sessionId = sessionId
    }

    if (searchTerm) {
      where.OR = [
        { customerName: { contains: searchTerm, mode: 'insensitive' } },
        { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
        { paymentNumber: { contains: searchTerm, mode: 'insensitive' } },
        { tableNumber: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // Get payments with pagination
    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              menuItemName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.payment.count({ where })
    ])

    // Calculate summary statistics
    const summaryWhere = { ...where }
    delete summaryWhere.OR // Remove search term for summary stats
    
    const summary = await prisma.payment.aggregate({
      where: summaryWhere,
      _sum: {
        subtotalAmount: true,
        finalAmount: true,
        discountAmount: true,
        extraChargesAmount: true
      },
      _count: true
    })

    // If sessionId is provided, return simple array for table view
    if (sessionId) {
      return NextResponse.json(payments)
    }

    // Otherwise return full response with pagination for billing history
    return NextResponse.json({
      payments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      },
      summary: {
        totalPayments: summary._count,
        totalRevenue: summary._sum.finalAmount || 0,
        totalSubtotal: summary._sum.subtotalAmount || 0,
        totalDiscounts: summary._sum.discountAmount || 0,
        totalExtraCharges: summary._sum.extraChargesAmount || 0
      }
    })

  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}