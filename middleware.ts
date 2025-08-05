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
     * - home page (/)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|^/$).*)',
  ],
};

// Tijdelijk: laat alles door zonder auth check
// TODO: Implementeer Auth0 v5 of een andere auth oplossing
export function middleware(request: NextRequest) {
  return NextResponse.next();
}