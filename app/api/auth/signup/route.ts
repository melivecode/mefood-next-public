import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { ownerName, email, password, restaurantName } = await request.json()

    if (!ownerName || !email || !password || !restaurantName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Create restaurant and user together using a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the restaurant first
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          email: email, // Use user email as default restaurant email
          isActive: true
        }
      })

      // Create the admin user linked to the restaurant
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          restaurantId: restaurant.id
        }
      })

      return { user, restaurant }
    })

    return NextResponse.json(
      { message: "User and restaurant created successfully", userId: result.user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
