import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const repo = await getKnowledgeRepository();
    const doc = await repo.getDocumentById(params.id, auth.tenantId);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: {
      id: (doc as any)._id?.toString(),
      title: (doc as any).title,
      path: (doc as any).path,
      sourceUrl: (doc as any).sourceUrl,
      scope: (doc as any).scope,
      companyId: (doc as any).companyId instanceof ObjectId ? (doc as any).companyId.toString() : (doc as any).companyId,
      updatedAt: (doc as any).updatedAt,
    } });
  } catch (e) {
    console.error('Knowledge document GET error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
