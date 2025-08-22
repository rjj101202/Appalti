import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';
import { resolveSiteIdFromUrl, getDriveByName, listFilesInSiteLibraryFolder, listFilesInUserOneDriveFolder, downloadTextContentForItem } from '@/lib/graph';
import { chunkText, computeChecksum, embedTexts } from '@/lib/rag';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

const qSchema = z.object({
  source: z.enum(['vertical','horizontal']),
  clientName: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50)
});

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const url = new URL(request.url);
    const parsed = qSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });

    const source = parsed.data.source;
    const limit = parsed.data.limit;
    let companyId: string | undefined;

    if (source === 'vertical') {
      const name = parsed.data.clientName || 'Intergarde';
      const clientRepo = await getClientCompanyRepository();
      const all = await clientRepo.findAll(auth.tenantId);
      const match = all.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
      if (!match) return NextResponse.json({ error: `ClientCompany not found: ${name}` }, { status: 404 });
      companyId = match._id!.toString();
    }

    const repo = await getKnowledgeRepository();
    let files: Array<{ id: string; name: string; webUrl: string; size?: number; mimeType?: string; path: string; __driveId?: string; __userUpn?: string }>= [];

    if (source === 'vertical') {
      const siteUrl = getEnv('GRAPH_VERTICAL_SITE_URL');
      const driveName = getEnv('GRAPH_VERTICAL_LIBRARY');
      const folder = process.env.GRAPH_VERTICAL_FOLDER || '';
      const { siteId } = await resolveSiteIdFromUrl(siteUrl);
      const drive = await getDriveByName(siteId, driveName);
      if (!drive) throw new Error(`Vertical drive not found: ${driveName}`);
      const items = await listFilesInSiteLibraryFolder(siteUrl, driveName, folder);
      files = items.map(i => ({ ...i, __driveId: drive.id }));
    } else {
      const userUpn = process.env.GRAPH_HORIZONTAL_ONEDRIVE_UPN || auth.email;
      const folder = process.env.GRAPH_HORIZONTAL_ONEDRIVE_PATH || '/Documents/Attachments';
      const items = await listFilesInUserOneDriveFolder(userUpn, folder);
      files = items.map(i => ({ ...i, __userUpn: userUpn }));
    }

    const allowed = files.filter(f => /\.(txt|md|markdown|csv|log|json|html?)$/i.test(f.name)).slice(0, limit);
    const ingested: any[] = [];

    for (const f of allowed) {
      const text = await downloadTextContentForItem({ driveId: f.__driveId, userUpn: f.__userUpn }, f.id, f.mimeType, f.name);
      if (!text) continue;
      const checksum = computeChecksum(text);
      const doc = await repo.upsertDocument(auth.tenantId, {
        scope: source,
        companyId: companyId ? new ObjectId(companyId) : undefined,
        title: f.name,
        sourceUrl: f.webUrl,
        driveId: f.__driveId,
        driveItemId: f.id,
        userUpn: f.__userUpn,
        path: f.path,
        mimeType: f.mimeType,
        size: f.size,
        checksum
      });
      const chunks = chunkText(text, { chunkSize: 1000, overlap: 150 });
      if (chunks.length === 0) continue;
      const embeddings = await embedTexts(chunks);
      const toInsert = chunks.map((t, i) => ({ text: t, embedding: embeddings[i], chunkIndex: i }));
      await repo.replaceChunks(auth.tenantId, doc._id as ObjectId, toInsert as any);
      ingested.push({ id: doc._id?.toString(), title: doc.title, chunks: chunks.length });
    }

    return NextResponse.json({ success: true, data: { scope: source, count: ingested.length, items: ingested } });
  } catch (e: any) {
    console.error('Knowledge ingest run-defaults error', e);
    return NextResponse.json({ error: e?.message || 'Failed to ingest' }, { status: 500 });
  }
}