import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'


// GET - Get a single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view staff details
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { staffId } = await params

    // Get admin's restaurant
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!admin?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Find staff member
    const staffMember = await prisma.user.findFirst({
      where: {
        id: staffId,
        restaurantId: admin.restaurantId,
        role: 'STAFF'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...staffMember,
      ownerName: staffMember.name
    })
  } catch (error) {
    console.error('Error fetching staff member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update a staff member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update staff
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { staffId } = await params

    // Get admin's restaurant
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!admin?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Verify staff member exists and belongs to this restaurant
    const existingStaff = await prisma.user.findFirst({
      where: {
        id: staffId,
        restaurantId: admin.restaurantId,
        role: 'STAFF'
      }
    })

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const body = await request.json()
    const { email, password, ownerName } = body

    // Validate email
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if email already exists (for other users)
    const emailExists = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        id: { not: staffId }
      }
    })

    if (emailExists) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      email: email.trim().toLowerCase(),
      name: ownerName?.trim() || null
    }

    // Only update password if provided
    if (password && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Update staff member
    const updatedStaff = await prisma.user.update({
      where: { id: staffId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      ...updatedStaff,
      ownerName: updatedStaff.name
    })
  } catch (error) {
    console.error('Error updating staff member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete staff
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { staffId } = await params

    // Get admin's restaurant
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!admin?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Verify staff member exists and belongs to this restaurant
    const existingStaff = await prisma.user.findFirst({
      where: {
        id: staffId,
        restaurantId: admin.restaurantId,
        role: 'STAFF'
      }
    })

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Delete staff member
    await prisma.user.delete({
      where: { id: staffId }
    })

    return NextResponse.json({ message: 'Staff member deleted successfully' })
  } catch (error) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
