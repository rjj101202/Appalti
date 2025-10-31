import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    
    // Only allow for Appalti users
    if (!(auth as any).isAppaltiUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDatabase();
    
    // Find all tenders with 1970-01-01 deadline (epoch)
    const epochDate = new Date('1970-01-01T00:00:00.000Z');
    
    const result = await db.collection('tenders').updateMany(
      {
        deadline: {
          $gte: new Date('1970-01-01T00:00:00.000Z'),
          $lt: new Date('1970-01-02T00:00:00.000Z')
        }
      },
      {
        $set: { deadline: null }
      }
    );

    return NextResponse.json({
      success: true,
      message: `Fixed ${result.modifiedCount} tenders with epoch deadlines`,
      modifiedCount: result.modifiedCount
    });
  } catch (e: any) {
    console.error('Fix deadlines error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

