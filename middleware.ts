import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth0';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Auth0 routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     * - home page (/)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|^/$).*)',
  ],
};

export async function middleware(request: NextRequest) {
  try {
    // Check of gebruiker is ingelogd
    const session = await getSession(request, new Response());
    
    if (!session || !session.user) {
      // Redirect naar login
      const returnTo = encodeURIComponent(request.url);
      return NextResponse.redirect(
        new URL(`/api/auth/login?returnTo=${returnTo}`, request.url)
      );
    }
    
    // Check of gebruiker een company membership heeft
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith('/dashboard') && !pathname.includes('/api/auth/registration')) {
      // Voor dashboard routes, check of user een active membership heeft
      // Dit doen we later via de auth context
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // Bij error, redirect naar home
    return NextResponse.redirect(new URL('/', request.url));
  }
}