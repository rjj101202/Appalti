import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string(), // ISO date string
  time: z.string().optional(),
  type: z.enum(['meeting', 'deadline', 'reminder', 'other']).optional(),
  relatedBidId: z.string().optional(),
  relatedTenderId: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const db = await getDatabase();

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = { userId: new ObjectId(auth.userId) };
    
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const events = await db.collection('user_calendar_events')
      .find(query)
      .sort({ date: 1 })
      .limit(100)
      .toArray();

    return NextResponse.json({ success: true, data: events });
  } catch (e: any) {
    console.error('Get calendar events error:', e);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const db = await getDatabase();
    const event = {
      userId: new ObjectId(auth.userId),
      title: parsed.data.title,
      description: parsed.data.description || '',
      date: new Date(parsed.data.date),
      time: parsed.data.time || null,
      type: parsed.data.type || 'other',
      relatedBidId: parsed.data.relatedBidId ? new ObjectId(parsed.data.relatedBidId) : null,
      relatedTenderId: parsed.data.relatedTenderId ? new ObjectId(parsed.data.relatedTenderId) : null,
      createdAt: new Date()
    };

    const result = await db.collection('user_calendar_events').insertOne(event);

    return NextResponse.json({ success: true, data: { ...event, _id: result.insertedId } }, { status: 201 });
  } catch (e: any) {
    console.error('Create calendar event error:', e);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('user_calendar_events').deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(auth.userId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Delete calendar event error:', e);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}

