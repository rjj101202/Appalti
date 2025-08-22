import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_95','final'])
});

export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if ((file as any).size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 30MB)' }, { status: 400 });
    }
    const safeName = `bids/${auth.tenantId}/${parsed.data.id}/${parsed.data.stage}/${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._/-]/g, '_');
    let blob: any;
    try {
      blob = await put(safeName, file, { access: 'public' });
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('VERCEL_BLOB_TOKEN')) {
        return NextResponse.json({ error: 'Blob misconfigured: set VERCEL_BLOB_READ_WRITE_TOKEN in env' }, { status: 500 });
      }
      console.error('Blob put error', e);
      return NextResponse.json({ error: 'Upload storage error' }, { status: 500 });
    }
    const db = await getDatabase();
    await db.collection('bids').updateOne(
      { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId, 'stages.key': parsed.data.stage },
      { $push: { 'stages.$.attachments': { name: file.name, url: blob.url, size: (file as any).size, type: (file as any).type } }, $set: { updatedAt: new Date(), updatedBy: new ObjectId(auth.userId) } }
    );
    return NextResponse.json({ success: true, url: blob.url });
  } catch (e) {
    console.error('Stage upload error', e);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}

