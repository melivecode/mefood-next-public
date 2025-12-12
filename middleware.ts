import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PROTECTED_ROUTES = [
  "/admin",
  "/restaurant-admin",
  "/restaurant"
]

// Routes that require ADMIN role
const ADMIN_ONLY_ROUTES = [
  "/restaurant-admin"
]

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/setup",
  "/api/setup"
]

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Allow public routes without authentication (including setup)
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Check if the route requires ADMIN role
  const isAdminOnlyRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route))

  if (token && isAdminOnlyRoute && token.role !== "ADMIN") {
    // Staff users trying to access admin pages get redirected to restaurant dashboard
    return NextResponse.redirect(new URL("/restaurant", request.url))
  }

  // If user is authenticated and on root, redirect to restaurant dashboard
  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL("/restaurant", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|auth|unauthorized).*)",
  ],
}
