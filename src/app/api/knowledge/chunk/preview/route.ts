import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId') || '';
    const chunkIndexStr = searchParams.get('chunkIndex') || '';
    const windowStr = searchParams.get('window') || '1';

    if (!docId || !chunkIndexStr) {
      return NextResponse.json({ error: 'Missing docId or chunkIndex' }, { status: 400 });
    }
    const chunkIndex = Number(chunkIndexStr);
    if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json({ error: 'Invalid chunkIndex' }, { status: 400 });
    }
    const contextWindow = Math.max(0, Math.min(2, Number(windowStr) || 1));

    const db = await getDatabase();
    const documentId = new ObjectId(docId);

    const minIdx = Math.max(0, chunkIndex - contextWindow);
    const maxIdx = chunkIndex + contextWindow;

    const chunks = await db
      .collection('knowledge_chunks')
      .find({ tenantId: auth.tenantId, documentId, chunkIndex: { $gte: minIdx, $lte: maxIdx } })
      .project({ text: 1, chunkIndex: 1, pageNumber: 1, metadata: 1, _id: 0 })
      .sort({ chunkIndex: 1 })
      .toArray();

    const byIndex = new Map<number, any>();
    for (const c of chunks) byIndex.set(c.chunkIndex, c);

    const focus = byIndex.get(chunkIndex) || null;
    const prev = byIndex.get(chunkIndex - 1) || null;
    const next = byIndex.get(chunkIndex + 1) || null;

    function sanitize(s: string): string {
      return String(s || '').replace(/\u0000/g, '').slice(0, 3000);
    }

    const payload = {
      focus: focus ? { text: sanitize(focus.text), chunkIndex, pageNumber: focus.pageNumber, metadata: focus.metadata } : null,
      prev: prev ? { text: sanitize(prev.text), chunkIndex: prev.chunkIndex, pageNumber: prev.pageNumber, metadata: prev.metadata } : null,
      next: next ? { text: sanitize(next.text), chunkIndex: next.chunkIndex, pageNumber: next.pageNumber, metadata: next.metadata } : null
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (e: any) {
    console.error('chunk preview error', e);
    return NextResponse.json({ error: e?.message || 'Failed to load preview' }, { status: 500 });
  }
}
