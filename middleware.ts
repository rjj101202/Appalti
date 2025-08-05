import { withMiddlewareAuthRequired, getSession } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Auth0 routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|$).*)',
  ],
};

export default withMiddlewareAuthRequired(async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSession(req, res);
  
  // Als user is ingelogd maar geen dbUserId heeft, redirect naar registratie
  if (session?.user && !session.user.dbUserId && !req.nextUrl.pathname.startsWith('/registration')) {
    return NextResponse.redirect(new URL('/registration', req.url));
  }
  
  // Dashboard routes require authenticated user with company
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session?.user?.tenantId) {
      return NextResponse.redirect(new URL('/registration', req.url));
    }
  }
  
  return res;
});