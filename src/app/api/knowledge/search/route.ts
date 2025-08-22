import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { embedTexts } from '@/lib/rag';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

const querySchema = z.object({
  q: z.string().min(2),
  scope: z.enum(['vertical','horizontal']).optional(),
  companyId: z.string().optional(),
  topK: z.coerce.number().min(1).max(20).default(8)
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });

    const repo = await getKnowledgeRepository();
    const [embedding] = await embedTexts([parsed.data.q]);

    const filter: any = {};
    if (parsed.data.scope) filter.scope = parsed.data.scope;
    // RBAC: vertical requires company match
    if (parsed.data.scope === 'vertical') {
      const companyId = parsed.data.companyId || auth.companyId;
      if (!companyId) return NextResponse.json({ error: 'companyId required for vertical scope' }, { status: 400 });
      filter.companyId = new ObjectId(companyId);
    }

    const hits = await repo.searchByEmbedding(auth.tenantId, embedding, parsed.data.topK, filter);

    // Fetch doc metadata for each hit
    const db = (await import('@/lib/mongodb')).getDatabase;
    const database = await db();
    const docIds = Array.from(new Set(hits.map(h => h.documentId.toString()))).map(id => new ObjectId(id));
    const docs = await database.collection('knowledge_documents').find({ _id: { $in: docIds } }).toArray();
    const byId = new Map(docs.map(d => [d._id.toString(), d]));

    const results = hits.map(h => ({
      text: h.text,
      chunkIndex: h.chunkIndex,
      document: {
        id: h.documentId.toString(),
        title: byId.get(h.documentId.toString())?.title,
        url: byId.get(h.documentId.toString())?.sourceUrl,
        path: byId.get(h.documentId.toString())?.path,
        scope: byId.get(h.documentId.toString())?.scope,
        companyId: byId.get(h.documentId.toString())?.companyId?.toString()
      }
    }));

    return NextResponse.json({ success: true, data: { results } });
  } catch (e: any) {
    console.error('Knowledge search error', e);
    return NextResponse.json({ error: e?.message || 'Failed to search' }, { status: 500 });
  }
}