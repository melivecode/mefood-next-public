import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PROTECTED_ROUTES = [
  "/admin",
  "/restaurant-admin", 
  "/restaurant"
]

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // If user is authenticated and on root, redirect to restaurant dashboard
  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL("/restaurant", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth|unauthorized).*)",
  ],
}