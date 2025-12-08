import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  // Remove PrismaAdapter to handle user management manually
  // adapter: PrismaAdapter(prisma),
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
          restaurantName: user.restaurantName,
          ownerName: user.ownerName,
          ownerImage: user.ownerImage
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
    async signIn({ account, profile }) {
      try {
        // Always allow credentials sign in
        if (account?.provider === "credentials") {
          return true
        }
        
        return true
      } catch (error) {
        return false
      }
    },
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = user.id
          token.restaurantName = user.restaurantName
          token.ownerName = user.ownerName
        }
        
        return token
      } catch (error) {
        return token
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          session.user.id = token.id as string
          session.user.restaurantName = token.restaurantName as string
          session.user.ownerName = token.ownerName as string | null
        }
        return session
      } catch (error) {
        return session
      }
    },
  },
}