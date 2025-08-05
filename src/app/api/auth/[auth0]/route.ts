import { NextRequest, NextResponse } from 'next/server';

// Tijdelijke auth routes totdat we de juiste Auth0 setup hebben
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Auth routes temporarily disabled',
    note: 'Auth0 v4 setup in progress'
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Auth routes temporarily disabled',
    note: 'Auth0 v4 setup in progress'
  });
}