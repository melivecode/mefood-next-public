import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT /api/restaurant/[id]/menu-items/[itemId]/selections/[selectionId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; selectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId, selectionId } = await params


    // Verify selection exists and belongs to the menu item
    const existingSelection = await prisma.selection.findFirst({
      where: {
        id: selectionId,
        menuItemId: itemId,
        menuItem: {
          userId: session.user.id
        }
      }
    })

    if (!existingSelection) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, isRequired, allowMultiple, options } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Selection name is required' }, { status: 400 })
    }

    // Update selection and replace options
    const updatedSelection = await prisma.selection.update({
      where: { id: selectionId },
      data: {
        name: name.trim(),
        isRequired: isRequired || false,
        allowMultiple: allowMultiple || false,
        options: {
          deleteMany: {}, // Delete all existing options
          create: (options || []).map((option: any, index: number) => ({
            name: option.name.trim(),
            priceAdd: parseFloat(option.priceAdd || 0),
            isAvailable: option.isAvailable !== false,
            sortOrder: index
          }))
        }
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json(updatedSelection)

  } catch (error) {
    console.error('Update selection error:', error)
    return NextResponse.json(
      { error: 'Failed to update selection' },
      { status: 500 }
    )
  }
}

// DELETE /api/restaurant/[id]/menu-items/[itemId]/selections/[selectionId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; selectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId, selectionId } = await params


    // Verify selection exists and belongs to the menu item
    const existingSelection = await prisma.selection.findFirst({
      where: {
        id: selectionId,
        menuItemId: itemId,
        menuItem: {
          userId: session.user.id
        }
      }
    })

    if (!existingSelection) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 })
    }

    // Delete selection (options will be deleted via cascade)
    await prisma.selection.delete({
      where: { id: selectionId }
    })

    return NextResponse.json({ success: true, message: 'Selection deleted successfully' })

  } catch (error) {
    console.error('Delete selection error:', error)
    return NextResponse.json(
      { error: 'Failed to delete selection' },
      { status: 500 }
    )
  }
}