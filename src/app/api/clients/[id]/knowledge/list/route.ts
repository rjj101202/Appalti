import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.MEMBER);

    const db = await getDatabase();
    const companyObjectId = new ObjectId(params.id);
    
    // Optional category filter from query params
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    
    // Build match query
    const matchQuery: any = { tenantId: auth.tenantId, companyId: companyObjectId, scope: 'vertical' };
    if (categoryFilter && ['profile', 'previous_bids', 'general'].includes(categoryFilter)) {
      matchQuery.category = categoryFilter;
    }

    const docs = await db.collection('knowledge_documents')
      .aggregate([
        { $match: matchQuery },
        { $lookup: { from: 'knowledge_chunks', localField: '_id', foreignField: 'documentId', as: 'chunks' } },
        { $addFields: { chunkCount: { $size: '$chunks' } } },
        { $project: { chunks: 0 } },
        { $sort: { updatedAt: -1 } }
      ])
      .toArray();

    const items = docs.map((d: any) => ({
      id: d._id.toString(),
      title: d.title,
      category: d.category || 'general', // Include category in response
      mimeType: d.mimeType,
      size: d.size,
      path: d.path,
      sourceUrl: d.sourceUrl,
      updatedAt: d.updatedAt,
      chunkCount: d.chunkCount || 0
    }));

    return NextResponse.json({ success: true, data: { items } });
  } catch (e: any) {
    console.error('Client knowledge list error', e);
    return NextResponse.json({ error: e?.message || 'Failed to list documents' }, { status: 500 });
  }
}
