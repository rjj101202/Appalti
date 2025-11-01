import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!(auth as any).isAppaltiUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDatabase();
    const tenderId = '69010453732587193e84011d'; // Applicatie Sociaal Domein
    
    console.log('[Test] Before update');
    const before = await db.collection('tenders').findOne({ _id: new ObjectId(tenderId) });
    console.log('[Test] Current deadline:', before?.deadline);
    
    const newDeadline = new Date('2025-12-23T00:00:00.000Z');
    console.log('[Test] Setting deadline to:', newDeadline);
    
    const result = await db.collection('tenders').updateOne(
      { _id: new ObjectId(tenderId) },
      { 
        $set: { 
          deadline: newDeadline,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('[Test] Update result:', {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      acknowledged: result.acknowledged
    });
    
    const after = await db.collection('tenders').findOne({ _id: new ObjectId(tenderId) });
    console.log('[Test] After update deadline:', after?.deadline);
    
    return NextResponse.json({
      success: true,
      before: { deadline: before?.deadline },
      after: { deadline: after?.deadline },
      updateResult: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (e: any) {
    console.error('[Test] Error:', e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

