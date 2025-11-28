import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

/**
 * GET /api/knowledge/documents/[documentId]/chunks
 * Returns document metadata and all chunks for highlighting
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: { documentId: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Fetch document
    const document = await db.collection('knowledge_documents').findOne({
      _id: new ObjectId(params.documentId),
      tenantId: auth.tenantId
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch all chunks for this document
    const chunks = await db.collection('knowledge_chunks')
      .find({ 
        documentId: new ObjectId(params.documentId),
        tenantId: auth.tenantId 
      })
      .sort({ chunkIndex: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        document: {
          id: document._id.toString(),
          title: document.title,
          path: document.path,
          sourceUrl: document.sourceUrl,
          contentType: document.contentType,
          totalChunks: chunks.length
        },
        chunks: chunks.map((c: any) => ({
          index: c.chunkIndex,
          text: c.text,
          pageNumber: c.pageNumber,
          paragraphIndex: c.paragraphIndex
        }))
      }
    });
  } catch (e: any) {
    console.error('Error fetching document chunks:', e);
    return NextResponse.json({ 
      error: 'Failed to fetch document chunks', 
      details: e.message 
    }, { status: 500 });
  }
}

