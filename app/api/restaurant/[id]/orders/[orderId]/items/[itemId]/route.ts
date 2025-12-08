import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, orderId, itemId } = await params


    // Get the order item to be deleted (verify ownership)
    const orderItem = await prisma.orderItem.findFirst({
      where: { 
        id: itemId,
        order: {
          userId: session.user.id
        }
      },
      include: {
        order: true
      }
    })

    if (!orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    if (orderItem.orderId !== orderId) {
      return NextResponse.json({ error: 'Order item does not belong to this order' }, { status: 400 })
    }

    // Check if order is in a state that allows modification
    const modifiableStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVING', 'DELIVERED']
    if (!modifiableStatuses.includes(orderItem.order.status)) {
      return NextResponse.json({ 
        error: `Cannot delete items from ${orderItem.order.status.toLowerCase()} orders. Items can only be deleted from orders with status: ${modifiableStatuses.join(', ')}` 
      }, { status: 400 })
    }

    // Calculate the amount to deduct from order total
    const itemTotal = parseFloat(orderItem.price.toString()) * orderItem.quantity

    // Delete the order item
    await prisma.orderItem.delete({
      where: { id: itemId }
    })

    // Update the order total amount (verify ownership)
    const updatedOrder = await prisma.order.update({
      where: { 
        id: orderId,
        userId: session.user.id
      },
      data: {
        totalAmount: {
          decrement: itemTotal
        }
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                selections: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // If order has no more items, you might want to cancel it
    if (updatedOrder.items.length === 0) {
      await prisma.order.update({
        where: { 
          id: orderId,
          userId: session.user.id
        },
        data: { status: 'CANCELLED' }
      })
    }

    return NextResponse.json({ 
      message: 'Order item removed successfully',
      order: updatedOrder
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove order item' },
      { status: 500 }
    )
  }
}