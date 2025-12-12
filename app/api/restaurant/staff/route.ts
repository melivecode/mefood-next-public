import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// GET - List all staff members for the current admin's restaurant
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view staff list
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the admin's restaurant
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!admin?.restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Find all staff users linked to the same restaurant
    const staffMembers = await prisma.user.findMany({
      where: {
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
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to expected format for backward compatibility
    const result = staffMembers.map(staff => ({
      ...staff,
      ownerName: staff.name // For backward compatibility with UI
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching staff members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new staff member
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create staff
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the admin's restaurant
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { restaurantId: true }
    })

    if (!admin?.restaurantId) {
      return NextResponse.json(
        { error: 'Please create your restaurant first' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { email, password, ownerName } = body

    // Validate required fields
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create staff user linked to the same restaurant (no duplication!)
    const staffUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        name: ownerName?.trim() || null,
        role: 'STAFF',
        restaurantId: admin.restaurantId
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

    // Return with backward compatible format
    return NextResponse.json({
      ...staffUser,
      ownerName: staffUser.name
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating staff member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
