import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

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

// Gebruik de Auth0 middleware
export default withMiddlewareAuthRequired();