import { NextRequest, NextResponse } from 'next/server';

// Tijdelijk disabled voor deployment
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // Voor nu redirect naar home
  if (action === 'login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } else if (action === 'logout') {
    return NextResponse.redirect(new URL('/', request.url));
  } else if (action === 'callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.json({ 
    message: 'Auth0 temporarily disabled for deployment',
    status: 'disabled' 
  });
}