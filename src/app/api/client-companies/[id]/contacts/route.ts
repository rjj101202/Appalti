import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const postBody = z.object({ name: z.string().min(2), email: z.string().email().optional(), role: z.string().optional() });

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const db = await getDatabase();
    const company = await db.collection('clientCompanies').findOne({ _id: new ObjectId(params.id), tenantId: auth.tenantId });
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: company.contacts || [] });
  } catch (e) {
    console.error('Contacts GET error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const json = await request.json();
    const body = postBody.safeParse(json);
    if (!body.success) return NextResponse.json({ error: 'Invalid body', details: body.error.issues }, { status: 400 });
    const db = await getDatabase();
    const contact = { _id: new ObjectId(), name: body.data.name, email: body.data.email, role: body.data.role };
    const res = await db.collection('clientCompanies').updateOne(
      { _id: new ObjectId(params.id), tenantId: auth.tenantId },
      { $push: { contacts: contact }, $set: { updatedAt: new Date(), updatedBy: auth.userId } }
    );
    if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: contact });
  } catch (e) {
    console.error('Contacts POST error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}