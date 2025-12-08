import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ itemId: string; selectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId, selectionId } = await params

    // Verify menu item exists and belongs to user
    const menuItem = await prisma.menuItem.findFirst({
      where: { 
        id: itemId,
        userId: session.user.id 
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    const selection = await prisma.selection.findFirst({
      where: { 
        id: selectionId,
        menuItemId: itemId 
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!selection) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 })
    }

    return NextResponse.json(selection)
  } catch (error) {
    console.error('Error fetching selection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string; selectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId, selectionId } = await params
    const body = await request.json()
    const { name, description, isRequired, allowMultiple, sortOrder, options } = body

    // Verify menu item exists and belongs to user
    const menuItem = await prisma.menuItem.findFirst({
      where: { 
        id: itemId,
        userId: session.user.id 
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Verify selection exists
    const existingSelection = await prisma.selection.findFirst({
      where: { 
        id: selectionId,
        menuItemId: itemId 
      }
    })

    if (!existingSelection) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 })
    }

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Selection name is required' },
        { status: 400 }
      )
    }

    // Update selection and replace options
    const updatedSelection = await prisma.$transaction(async (tx) => {
      // Delete existing options
      await tx.selectionOption.deleteMany({
        where: { selectionId }
      })

      // Update selection and create new options
      return tx.selection.update({
        where: { id: selectionId },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          isRequired: Boolean(isRequired ?? false),
          allowMultiple: Boolean(allowMultiple ?? false),
          sortOrder: Number(sortOrder) || 0,
          options: {
            create: (options || []).map((option: any, index: number) => ({
              name: option.name.trim(),
              description: option.description?.trim() || null,
              priceAdd: parseFloat(option.priceAdd) || 0,
              isAvailable: Boolean(option.isAvailable ?? true),
              sortOrder: Number(option.sortOrder) || index
            }))
          }
        },
        include: {
          options: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
    })

    return NextResponse.json(updatedSelection)
  } catch (error) {
    console.error('Error updating selection:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ itemId: string; selectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId, selectionId } = await params

    // Verify menu item exists and belongs to user
    const menuItem = await prisma.menuItem.findFirst({
      where: { 
        id: itemId,
        userId: session.user.id 
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Verify selection exists
    const existingSelection = await prisma.selection.findFirst({
      where: { 
        id: selectionId,
        menuItemId: itemId 
      }
    })

    if (!existingSelection) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 })
    }

    // Delete selection (options will be cascade deleted)
    await prisma.selection.delete({
      where: { id: selectionId }
    })

    return NextResponse.json({ message: 'Selection deleted successfully' })
  } catch (error) {
    console.error('Error deleting selection:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}