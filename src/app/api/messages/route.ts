import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const createMessageSchema = z.object({
  toUserId: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().min(1),
  relatedBidId: z.string().optional(),
  relatedTenderId: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const db = await getDatabase();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' or 'received'

    let query: any = {};
    if (type === 'sent') {
      query.fromUserId = new ObjectId(auth.userId);
    } else if (type === 'received') {
      query.toUserId = new ObjectId(auth.userId);
    } else {
      // Both sent and received
      query.$or = [
        { fromUserId: new ObjectId(auth.userId) },
        { toUserId: new ObjectId(auth.userId) }
      ];
    }

    const messages = await db.collection('messages')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Enrich with user names
    const userIds = [...new Set(messages.flatMap((m: any) => [m.fromUserId, m.toUserId]))];
    const users = await db.collection('users')
      .find({ _id: { $in: userIds } })
      .project({ _id: 1, name: 1, email: 1, avatar: 1 })
      .toArray();
    
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const enriched = messages.map((m: any) => ({
      ...m,
      fromUser: userMap.get(m.fromUserId.toString()),
      toUser: userMap.get(m.toUserId.toString())
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (e: any) {
    console.error('Get messages error:', e);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const db = await getDatabase();
    const message = {
      fromUserId: new ObjectId(auth.userId),
      toUserId: new ObjectId(parsed.data.toUserId),
      subject: parsed.data.subject,
      message: parsed.data.message,
      relatedBidId: parsed.data.relatedBidId ? new ObjectId(parsed.data.relatedBidId) : null,
      relatedTenderId: parsed.data.relatedTenderId ? new ObjectId(parsed.data.relatedTenderId) : null,
      isRead: false,
      createdAt: new Date()
    };

    const result = await db.collection('messages').insertOne(message);

    return NextResponse.json({ success: true, data: { ...message, _id: result.insertedId } }, { status: 201 });
  } catch (e: any) {
    console.error('Create message error:', e);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

