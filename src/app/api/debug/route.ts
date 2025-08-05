import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Alleen in development!
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    environment: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      hasAuth0ClientId: !!process.env.AUTH0_CLIENT_ID,
      hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    },
    request: {
      url: request.url,
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
    }
  });
}