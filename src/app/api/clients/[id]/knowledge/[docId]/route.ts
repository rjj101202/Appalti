import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN);

    const db = await getDatabase();
    const companyObjectId = new ObjectId(params.id);
    const docObjectId = new ObjectId(params.docId);

    // Ensure the document belongs to this tenant/company
    const doc = await db.collection('knowledge_documents').findOne({ _id: docObjectId, tenantId: auth.tenantId, companyId: companyObjectId, scope: 'vertical' });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    await db.collection('knowledge_chunks').deleteMany({ tenantId: auth.tenantId, documentId: docObjectId });
    await db.collection('knowledge_documents').deleteOne({ _id: docObjectId });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Client knowledge delete error', e);
    return NextResponse.json({ error: e?.message || 'Failed to delete document' }, { status: 500 });
  }
}

// GET /api/clients/[id]/knowledge/[docId]?offset=0&limit=50
// Returns metadata and text chunks for viewer purposes (RBAC-enforced)
export async function GET(request: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.MEMBER);

    const db = await getDatabase();
    const companyObjectId = new ObjectId(params.id);
    const docObjectId = new ObjectId(params.docId);
    const url = new URL(request.url);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));

    const doc = await db.collection('knowledge_documents').findOne({ _id: docObjectId, tenantId: auth.tenantId, companyId: companyObjectId, scope: 'vertical' });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const total = await db.collection('knowledge_chunks').countDocuments({ tenantId: auth.tenantId, documentId: docObjectId });
    const chunks = await db.collection('knowledge_chunks')
      .find({ tenantId: auth.tenantId, documentId: docObjectId })
      .sort({ chunkIndex: 1 })
      .skip(offset)
      .limit(limit)
      .project({ text: 1, chunkIndex: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        document: {
          id: doc._id?.toString(),
          title: doc.title,
          mimeType: doc.mimeType,
          size: doc.size,
          updatedAt: doc.updatedAt,
        },
        totalChunks: total,
        offset,
        limit,
        chunks: chunks.map(c => ({ index: c.chunkIndex, text: c.text }))
      }
    });
  } catch (e: any) {
    console.error('Client knowledge get error', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch document' }, { status: 500 });
  }
}
