import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ user: null });
    }
    
    return NextResponse.json({ 
      user: {
        email: session.user.email,
        name: session.user.name,
        picture: session.user.image,
        emailVerified: (session as any)?.user?.emailVerified ?? undefined,
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json({ user: null });
  }
}