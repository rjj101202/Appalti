import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';
import { resolveSiteIdFromUrl, getDriveByName, listFilesInSiteLibraryFolder, listFilesInUserOneDriveFolder, downloadTextContentForItem } from '@/lib/graph';
import { listFolderChildrenShallow } from '@/lib/graph';
import { chunkText, computeChecksum, embedTexts } from '@/lib/rag';
import { ObjectId } from 'mongodb';
import mammoth from 'mammoth';
import { downloadBinaryContentForItem } from '@/lib/graph';

export const runtime = 'nodejs';

const qSchema = z.object({
  source: z.enum(['vertical','horizontal']),
  clientName: z.string().optional(),
  clientId: z.string().optional(),
  folderName: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  subfolder: z.string().optional()
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
    let companyNameForFolder: string | undefined;

    if (source === 'vertical') {
      // Resolve companyId; keep original clientName for folder matching preference
      if (parsed.data.clientId) {
        companyId = parsed.data.clientId;
        companyNameForFolder = parsed.data.clientName; // optional
      } else if (parsed.data.clientName) {
        const name = (parsed.data.clientName || '').trim();
        const clientRepo = await getClientCompanyRepository();
        const all = await clientRepo.findAll(auth.tenantId);
        const lower = name.toLowerCase();
        const match = all.find(c => (c.name || '').toLowerCase() === lower) ||
                      all.find(c => (c.name || '').toLowerCase().includes(lower));
        if (!match) return NextResponse.json({ error: `ClientCompany not found: ${parsed.data.clientName}` }, { status: 404 });
        companyId = match._id!.toString();
        // Prefer the provided name for folder matching; fallback to DB name if none provided
        companyNameForFolder = parsed.data.clientName || match.name;
      } else {
        return NextResponse.json({ error: 'clientName or clientId is required for vertical ingest' }, { status: 400 });
      }
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
      // Shallow listing van de topmap (bijv. /Klanten Shares) om throttling/timeouts te beperken
      const topChildren = await listFolderChildrenShallow(drive.id, folder || '/');
      const needles = [parsed.data.folderName, companyNameForFolder, parsed.data.clientName].filter(Boolean).map(s => String(s).toLowerCase());
      const pickFolder = () => {
        for (const item of topChildren) {
          if (item.mimeType) continue; // skip files
          const nameLc = item.name.toLowerCase();
          for (const n of needles) {
            if (!n) continue;
            if (nameLc === n || nameLc.includes(n) || n.includes(nameLc)) return item;
          }
        }
        return undefined;
      };
      const clientFolder = pickFolder();
      if (!clientFolder) {
        const sample = topChildren.filter(c => !c.mimeType).slice(0, 20).map(c => c.name).join(', ');
        const wanted = needles.join(' | ');
        return NextResponse.json({ error: `Geen klantmap gevonden die lijkt op [${wanted}] onder ${folder || '/'} (library ${driveName}). Beschikbaar (eerste 20): ${sample}` }, { status: 404 });
      }
      // Nu pas recursief binnen de (optionele) subfolder
      const targetPath = parsed.data.subfolder ? `${clientFolder.path}/${parsed.data.subfolder}` : clientFolder.path;
      const items = await listFilesInSiteLibraryFolder(siteUrl, driveName, targetPath);
      files = items.map(i => ({ ...i, __driveId: drive.id }));
    } else {
      const userUpn = process.env.GRAPH_HORIZONTAL_ONEDRIVE_UPN || auth.email;
      const folder = process.env.GRAPH_HORIZONTAL_ONEDRIVE_PATH || '/Documents/Attachments';
      const items = await listFilesInUserOneDriveFolder(userUpn, folder);
      files = items.map(i => ({ ...i, __userUpn: userUpn }));
    }

    // Extend allowed: include docx
    const finalList = files.filter(f => /\.(txt|md|markdown|csv|log|json|html?|docx)$/i.test(f.name)).slice(0, limit);
    const ingested: any[] = [];

    for (const f of finalList) {
      let text: string | null = null;
      if (/\.docx$/i.test(f.name)) {
        const bin = await downloadBinaryContentForItem({ driveId: f.__driveId, userUpn: f.__userUpn }, f.id);
        if (bin) {
          const result = await mammoth.extractRawText({ buffer: Buffer.from(bin) });
          text = (result.value || '').trim();
        }
      } else {
        text = await downloadTextContentForItem({ driveId: f.__driveId, userUpn: f.__userUpn }, f.id, f.mimeType, f.name);
      }
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
      ingested.push({ id: doc._id?.toString(), title: doc.title, chunks: chunks.length, path: f.path });
    }

    return NextResponse.json({ success: true, data: { scope: source, count: ingested.length, items: ingested } });
  } catch (e: any) {
    console.error('Knowledge ingest run-defaults error', e);
    return NextResponse.json({ error: e?.message || 'Failed to ingest' }, { status: 500 });
  }
}