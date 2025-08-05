import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Tijdelijk: return hardcoded user voor development
  // TODO: Implementeer Auth0 v5 of een andere auth oplossing
  return NextResponse.json({ 
    user: {
      email: 'admin@appalti.nl',
      name: 'Admin User',
      picture: null,
    }
  });
}