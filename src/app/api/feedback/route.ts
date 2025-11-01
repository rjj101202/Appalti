import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    
    const { message, page, rating } = body;
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    const feedback = {
      userId: new ObjectId(auth.userId),
      userEmail: auth.email,
      userName: auth.name,
      tenantId: auth.tenantId,
      companyId: auth.companyId ? new ObjectId(auth.companyId) : null,
      message: message.trim(),
      page: page || '',
      rating: rating || null,
      createdAt: new Date(),
      status: 'new'
    };
    
    const result = await db.collection('feedback').insertOne(feedback);
    
    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (e: any) {
    console.error('Feedback POST error:', e);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    
    // Only Appalti users can view all feedback
    if (!(auth as any).isAppaltiUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    
    const db = await getDatabase();
    const feedbacks = await db.collection('feedback')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray();
    
    if (format === 'csv') {
      // Generate CSV
      const headers = ['Date', 'User Email', 'User Name', 'Page', 'Rating', 'Message', 'Status'];
      const rows = feedbacks.map(f => [
        new Date(f.createdAt).toISOString(),
        f.userEmail || '',
        f.userName || '',
        f.page || '',
        f.rating || '',
        (f.message || '').replace(/"/g, '""'), // Escape quotes
        f.status || 'new'
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="feedback-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
    
    return NextResponse.json({ success: true, data: feedbacks });
  } catch (e: any) {
    console.error('Feedback GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

