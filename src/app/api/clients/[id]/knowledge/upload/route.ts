import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { chunkText, computeChecksum, embedTexts } from '@/lib/rag';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';

export const runtime = 'nodejs';

function isAllowedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (/(\.pdf|\.docx|\.txt|\.md|\.markdown|\.html|\.htm)$/.test(lower)) return true;
  const type = (file as any).type || '';
  return /(pdf|word|text|markdown|html)/i.test(type);
}

async function extractTextFromFile(file: File): Promise<string | null> {
  const lower = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  try {
    if (lower.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      return (parsed.text || '').toString();
    }
    if (lower.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const res = await mammoth.extractRawText({ buffer });
      return (res.value || '').toString();
    }
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      const text = buffer.toString('utf-8');
      return text
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
    }
    // txt/md/markdown and other plain
    return buffer.toString('utf-8');
  } catch (e) {
    console.warn('extractTextFromFile failed', file.name, e);
    return null;
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    // Require member or higher on active company
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.MEMBER);

    const db = await getDatabase();
    const companyObjectId = new ObjectId(params.id);
    const client = await db.collection('clientCompanies').findOne({ _id: companyObjectId, tenantId: auth.tenantId });
    if (!client) return NextResponse.json({ error: 'Client company not found' }, { status: 404 });

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }
    const form = await request.formData();
    const files = form.getAll('files');
    if (!files.length) return NextResponse.json({ error: 'files are required' }, { status: 400 });

    const maxBytes = 30 * 1024 * 1024; // 30MB
    const repo = await getKnowledgeRepository();
    const results: Array<{ file: string; ok: boolean; reason?: string; chunks?: number; documentId?: string }> = [];

    for (const f of files) {
      if (!(f instanceof File)) {
        results.push({ file: 'unknown', ok: false, reason: 'Not a file' });
        continue;
      }
      const file = f as File;
      if (!isAllowedFile(file)) {
        results.push({ file: file.name, ok: false, reason: 'Unsupported file type' });
        continue;
      }
      if ((file as any).size > maxBytes) {
        results.push({ file: file.name, ok: false, reason: 'File too large (max 30MB)' });
        continue;
      }

      const text = await extractTextFromFile(file);
      if (!text || !text.trim()) {
        results.push({ file: file.name, ok: false, reason: 'No text could be extracted' });
        continue;
      }

      const checksum = computeChecksum(text);
      const safePath = `uploads/${auth.tenantId}/${companyObjectId.toString()}/${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._/-]/g, '_');

      // Upsert doc metadata (no binary stored)
      const doc = await repo.upsertDocument(auth.tenantId, {
        scope: 'vertical',
        companyId: companyObjectId,
        title: file.name,
        path: safePath,
        mimeType: (file as any).type || undefined,
        size: (file as any).size || undefined,
        checksum,
      } as any);

      const chunks = chunkText(text, { chunkSize: 1000, overlap: 150 });
      if (chunks.length === 0) {
        results.push({ file: file.name, ok: false, reason: 'No chunks produced' });
        continue;
      }
      const vectors = await embedTexts(chunks);
      const toInsert = chunks.map((t, i) => ({ text: t, embedding: vectors[i], chunkIndex: i }));
      await repo.replaceChunks(auth.tenantId, doc._id as ObjectId, toInsert as any);
      results.push({ file: file.name, ok: true, chunks: chunks.length, documentId: (doc._id as ObjectId)?.toString() });
    }

    const successCount = results.filter(r => r.ok).length;
    return NextResponse.json({ success: true, data: { uploaded: successCount, results } });
  } catch (e: any) {
    console.error('Client knowledge upload error', e);
    return NextResponse.json({ error: e?.message || 'Failed to upload and ingest' }, { status: 500 });
  }
}
