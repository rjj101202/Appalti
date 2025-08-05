import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth0';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, new Response());
    
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