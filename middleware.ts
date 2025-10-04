import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    // Protect all dashboard routes
    "/dashboard/:path*",
    // Protect other authenticated routes
    "/settings/:path*",
    "/profile/:path*",
    // Exclude API routes and static files
    "/((?!api|_next/static|_next/image|favicon.ico|signin|signup|reset-password).*)",
  ]
}
