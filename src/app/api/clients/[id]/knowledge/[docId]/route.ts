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
