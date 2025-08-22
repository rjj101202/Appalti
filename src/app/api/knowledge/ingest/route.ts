import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';
import { listFilesInSiteLibraryFolder, listFilesInUserOneDriveFolder, resolveSiteIdFromUrl, listSiteDrives, getDriveByName, downloadTextContentForItem } from '@/lib/graph';
import { chunkText, computeChecksum, embedTexts } from '@/lib/rag';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

const bodySchema = z.object({
  source: z.enum(['vertical','horizontal']),
  companyId: z.string().optional(), // required for vertical
  limit: z.number().min(1).max(200).optional()
});

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });

    const repo = await getKnowledgeRepository();
    const source = parsed.data.source;
    const limit = parsed.data.limit || 100;

    let files: Array<{ id: string; name: string; webUrl: string; size?: number; mimeType?: string; path: string; __driveId?: string; __userUpn?: string }>= [];

    if (source === 'vertical') {
      const siteUrl = getEnv('GRAPH_VERTICAL_SITE_URL');
      const driveName = getEnv('GRAPH_VERTICAL_LIBRARY');
      const folder = process.env.GRAPH_VERTICAL_FOLDER || '';
      // Resolve drive id
      const { siteId } = await resolveSiteIdFromUrl(siteUrl);
      const drive = await getDriveByName(siteId, driveName);
      if (!drive) throw new Error(`Vertical drive not found: ${driveName}`);
      const items = await listFilesInSiteLibraryFolder(siteUrl, driveName, folder);
      files = items.map(i => ({ ...i, __driveId: drive.id }));
    } else {
      const userUpn = process.env.GRAPH_HORIZONTAL_ONEDRIVE_UPN || auth.email; // fallback to user email
      const folder = process.env.GRAPH_HORIZONTAL_ONEDRIVE_PATH || '/Documents/Attachments';
      const items = await listFilesInUserOneDriveFolder(userUpn, folder);
      files = items.map(i => ({ ...i, __userUpn: userUpn }));
    }

    // Filter file types we can parse directly for now
    const allowed = files.filter(f => /\.(txt|md|markdown|csv|log|json|html?)$/i.test(f.name)).slice(0, limit);

    const ingested: any[] = [];
    for (const f of allowed) {
      const text = await downloadTextContentForItem({ driveId: f.__driveId, userUpn: f.__userUpn }, f.id, f.mimeType, f.name);
      if (!text) continue;
      const checksum = computeChecksum(text);
      const doc = await repo.upsertDocument(auth.tenantId, {
        scope: source,
        companyId: parsed.data.companyId ? new ObjectId(parsed.data.companyId) : undefined,
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

    return NextResponse.json({ success: true, data: { count: ingested.length, items: ingested } });
  } catch (e: any) {
    console.error('Knowledge ingest error', e);
    return NextResponse.json({ error: e?.message || 'Failed to ingest' }, { status: 500 });
  }
}