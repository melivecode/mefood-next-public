import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      restaurantId?: string | null
      restaurantName?: string | null
      role: "ADMIN" | "STAFF"
    }
  }

  interface User {
    id: string
    name: string | null
    image: string | null
    restaurantId: string | null
    restaurantName: string | null
    role: "ADMIN" | "STAFF"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    name: string | null
    restaurantId: string | null
    restaurantName: string | null
    role: "ADMIN" | "STAFF"
  }
}
