import { PrismaClient } from '@prisma/client'

export type SetupStatus = {
  databaseConnected: boolean
  tablesExist: boolean
  hasAdminUser: boolean
  hasRestaurant: boolean
  needsSetup: boolean
  error?: string
}

export async function checkSetupStatus(): Promise<SetupStatus> {
  const status: SetupStatus = {
    databaseConnected: false,
    tablesExist: false,
    hasAdminUser: false,
    hasRestaurant: false,
    needsSetup: true
  }

  const prisma = new PrismaClient()

  try {
    // Test database connection
    await prisma.$connect()
    status.databaseConnected = true

    // Check if tables exist by trying to query users
    try {
      const userCount = await prisma.user.count()
      status.tablesExist = true
      status.hasAdminUser = userCount > 0

      // Check if any restaurant exists
      const restaurantCount = await prisma.restaurant.count()
      status.hasRestaurant = restaurantCount > 0

      // Setup is complete if we have at least one admin user
      status.needsSetup = !status.hasAdminUser
    } catch (tableError) {
      // Tables don't exist yet
      status.tablesExist = false
      status.needsSetup = true
    }
  } catch (error) {
    status.databaseConnected = false
    status.needsSetup = true
    status.error = error instanceof Error ? error.message : 'Unknown database error'
  } finally {
    await prisma.$disconnect()
  }

  return status
}

export async function canAccessSetup(): Promise<boolean> {
  const status = await checkSetupStatus()
  // Allow setup access only if:
  // 1. Database is not connected, OR
  // 2. Tables don't exist, OR
  // 3. No admin user exists
  return !status.databaseConnected || !status.tablesExist || !status.hasAdminUser
}
