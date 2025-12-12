import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            restaurant: true
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          restaurantId: user.restaurantId,
          restaurantName: user.restaurant?.name || null,
          role: user.role
        } as any
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ account }) {
      try {
        // Always allow credentials sign in
        if (account?.provider === "credentials") {
          return true
        }

        return true
      } catch {
        return false
      }
    },
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = user.id
          token.name = user.name
          token.restaurantId = user.restaurantId
          token.restaurantName = user.restaurantName
          token.role = user.role
        }

        return token
      } catch {
        return token
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          session.user.id = token.id as string
          session.user.name = token.name as string | null
          session.user.restaurantId = token.restaurantId as string | null
          session.user.restaurantName = token.restaurantName as string | null
          session.user.role = token.role as "ADMIN" | "STAFF"
        }
        return session
      } catch {
        return session
      }
    },
  },
}
