import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const isDev = process.env.NODE_ENV !== 'production';

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl;

  // Exempt health and debug endpoints from auth checks
  if (pathname.startsWith('/api/health') || pathname.startsWith('/api/debug')) {
    return NextResponse.next();
  }

  // Debug logging only in development
  if (isDev) {
    console.log('Middleware - Path:', pathname)
    console.log('Middleware - Session:', !!session)
  }

  // Als geen sessie en niet op home/auth pagina's
  if (!session && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - auth (NextAuth pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     * - home page (/)
     */
    '/((?!api/auth|api/health|api/debug|auth|_next/static|_next/image|favicon.ico|.*\\..*|^/$).*)',
  ],
};