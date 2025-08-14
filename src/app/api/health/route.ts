import { NextResponse } from 'next/server';
import { pingDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const db = await pingDatabase();
    const session = await auth();

    return NextResponse.json({
      ok: true,
      db,
      auth: {
        hasSession: !!session,
        userEmail: session?.user?.email || null,
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasIssuer: !!process.env.AUTH0_ISSUER_BASE_URL,
        hasClientId: !!process.env.AUTH0_CLIENT_ID,
        hasClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}