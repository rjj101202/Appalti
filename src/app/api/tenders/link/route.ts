import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getTenderRepository } from '@/lib/db/repositories/tenderRepository';
import { getBidRepository } from '@/lib/db/repositories/bidRepository';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { fetchTenderNedXml } from '@/lib/tenderned';
import { parseEformsSummary } from '@/lib/tenderned-parse';

const bodySchema = z.object({
  source: z.enum(['tenderned']),
  externalId: z.string().min(1),
  clientCompanyId: z.string().min(1),
  title: z.string().min(1),
  cpvCodes: z.array(z.string()).optional(),
  deadline: z.union([z.string(), z.date()]).optional(),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => { throw new Error('Forbidden'); });

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });

    // For TenderNed tenders, fetch the real deadline from XML if not provided or invalid
    let finalDeadline = parsed.data.deadline ? new Date(parsed.data.deadline as any) : undefined;
    
    if (parsed.data.source === 'tenderned' && parsed.data.externalId) {
      try {
        const xml = await fetchTenderNedXml(parsed.data.externalId);
        const summary = parseEformsSummary(xml);
        
        if (summary?.deadlineDate) {
          // Parse deadline correctly (handle timezone offsets)
          const dateStr = String(summary.deadlineDate);
          const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) {
            finalDeadline = new Date(match[1] + 'T00:00:00.000Z');
            console.log(`[Tender Link] Fetched deadline from TenderNed: ${finalDeadline.toISOString()}`);
          }
        } else {
          finalDeadline = undefined;
          console.log(`[Tender Link] No deadline found in TenderNed XML`);
        }
      } catch (e) {
        console.warn(`[Tender Link] Failed to fetch TenderNed deadline, using provided:`, e);
        // Fall back to provided deadline
      }
    }

    const repo = await getTenderRepository();
    const tender = await repo.upsertByExternalId(auth.tenantId, {
      source: parsed.data.source,
      externalId: parsed.data.externalId,
      clientCompanyId: new ObjectId(parsed.data.clientCompanyId) as any,
      title: parsed.data.title,
      description: parsed.data.description,
      cpvCodes: parsed.data.cpvCodes,
      deadline: finalDeadline,
      status: 'draft' as any,
    });

    // Ensure bid process exists
    const bidRepo = await getBidRepository();
    // Best-effort: check of er al een bid proces bestaat
    const db = await getDatabase();
    let existing = await db.collection('bids').findOne({ tenantId: auth.tenantId, tenderId: tender._id });
    if (!existing) {
      await bidRepo.create({ tenantId: auth.tenantId, tenderId: String(tender._id), clientCompanyId: parsed.data.clientCompanyId, createdBy: auth.userId });
    }

    return NextResponse.json({ success: true, data: tender }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Tenders link POST error', e);
    return NextResponse.json({ error: 'Failed to link tender' }, { status: 500 });
  }
}

