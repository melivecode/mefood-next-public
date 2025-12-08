import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/restaurant/[id]/payments/[paymentId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId, paymentId } = await params
    

    // Get payment details
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: session.user.id // Ensure payment belongs to the user
      },
      include: {
        items: {
          orderBy: {
            menuItemName: 'asc'
          }
        },
        session: {
          select: {
            id: true,
            status: true,
            tableId: true,
            waiter: {
              select: {
                id: true,
                ownerName: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Process items to resolve selection option IDs to readable text
    const processedItems = await Promise.all(
      payment.items.map(async (item) => {
        if (!item.selections) return item

        let parsedSelections
        try {
          // Ensure selections is a string before parsing
          const selectionsString = typeof item.selections === 'string' ? item.selections : JSON.stringify(item.selections)
          parsedSelections = JSON.parse(selectionsString)
        } catch {
          return item
        }

        // Resolve option IDs to readable text
        const resolvedSelections: { [key: string]: string[] } = {}
        
        for (const [selectionId, optionIds] of Object.entries(parsedSelections)) {
          if (!optionIds || (Array.isArray(optionIds) && optionIds.length === 0)) continue

          const ids = Array.isArray(optionIds) ? optionIds : [optionIds]
          
          // Fetch option details with selection name
          const options = await prisma.selectionOption.findMany({
            where: {
              id: { in: ids }
            },
            select: {
              name: true,
              priceAdd: true,
              selection: {
                select: {
                  name: true
                }
              }
            }
          })

          if (options.length > 0) {
            // Use the selection name from the first option (they all belong to the same selection)
            const selectionName = options[0].selection.name
            
            resolvedSelections[selectionName] = options.map(opt => {
              const priceAdd = Number(opt.priceAdd)
              return priceAdd > 0 ? `${opt.name} (+B${priceAdd.toFixed(2)})` : opt.name
            })
          }
        }

        return {
          ...item,
          selections: JSON.stringify(resolvedSelections)
        }
      })
    )

    // Return payment with processed items
    const processedPayment = {
      ...payment,
      items: processedItems
    }

    return NextResponse.json(processedPayment)

  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    )
  }
}