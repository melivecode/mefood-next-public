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

    const user = await prisma.user.create({
      data: {
        ownerName,
        email,
        password: hashedPassword,
        restaurantName,
        restaurantDescription: null,
        restaurantAddress: null,
        restaurantPhone: null,
        restaurantEmail: email, // Use user email as default restaurant email
        isRestaurantActive: true
      }
    })

    return NextResponse.json(
      { message: "User and restaurant created successfully", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}