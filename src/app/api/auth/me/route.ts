import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ user: null });
    }
    
    return NextResponse.json({ 
      user: {
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json({ user: null });
  }
}