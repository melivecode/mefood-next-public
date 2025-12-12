import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { canAccessSetup } from '@/lib/utils/setupCheck'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Security: Only allow if setup is needed
    const canAccess = await canAccessSetup()
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Setup already completed. Admin user already exists.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      // Admin user details
      adminName,
      adminEmail,
      adminPassword,
      // Restaurant details
      restaurantName,
      restaurantDescription,
      restaurantAddress,
      restaurantPhone
    } = body

    // Validate required fields
    if (!adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin name, email, and password are required' },
        { status: 400 }
      )
    }

    if (!restaurantName) {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      )
    }

    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase().trim() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    // Create restaurant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create restaurant first
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName.trim(),
          description: restaurantDescription?.trim() || null,
          address: restaurantAddress?.trim() || null,
          phone: restaurantPhone?.trim() || null,
          isActive: true
        }
      })

      // Create admin user linked to restaurant
      const user = await tx.user.create({
        data: {
          name: adminName.trim(),
          email: adminEmail.toLowerCase().trim(),
          password: hashedPassword,
          role: 'ADMIN',
          restaurantId: restaurant.id
        }
      })

      return { user, restaurant }
    })

    return NextResponse.json({
      success: true,
      message: 'Admin user and restaurant created successfully',
      data: {
        userId: result.user.id,
        restaurantId: result.restaurant.id,
        restaurantName: result.restaurant.name
      }
    })
  } catch (error) {
    console.error('Create admin error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create admin user'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
