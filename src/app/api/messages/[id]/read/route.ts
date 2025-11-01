import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    const db = await getDatabase();

    const result = await db.collection('messages').updateOne(
      {
        _id: new ObjectId(params.id),
        toUserId: new ObjectId(auth.userId)
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Mark message read error:', e);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}

