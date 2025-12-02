import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  id: z.string().min(1)
});

/**
 * POST /api/bids/[id]/kickoff/upload
 * Upload het aanbestedingsdocument (leidraad) voor kick-off generatie
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Valideer bestandsgrootte (max 30MB)
    if ((file as any).size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 30MB)' }, { status: 400 });
    }

    // Valideer bestandstype
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
      return NextResponse.json({ error: 'Only PDF and Word documents are supported' }, { status: 400 });
    }

    // Upload naar Vercel Blob
    const safeName = `bids/${auth.tenantId}/${parsed.data.id}/kickoff/${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._/-]/g, '_');
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

    // Update de bid met het geüploade document
    const db = await getDatabase();
    await db.collection('bids').updateOne(
      { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
      { 
        $set: { 
          'kickoff.leidraadDocument': {
            name: file.name,
            url: blob.url,
            uploadedAt: new Date()
          },
          'kickoff.status': 'document_uploaded',
          updatedAt: new Date(),
          updatedBy: new ObjectId(auth.userId)
        }
      }
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        name: file.name,
        url: blob.url
      }
    });
  } catch (e: any) {
    console.error('Kickoff upload error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to upload document' }, { status: 500 });
  }
}

