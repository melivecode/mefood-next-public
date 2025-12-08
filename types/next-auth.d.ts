import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      restaurantName: string
      ownerName?: string | null
    }
  }

  interface User {
    id: string
    restaurantName: string
    ownerName: string | null
    ownerImage: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    restaurantName: string
    ownerName: string | null
  }
}