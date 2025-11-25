import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { fetchTenderNed, fetchTenderNedXml } from '@/lib/tenderned';
import { parseEformsSummary } from '@/lib/tenderned-parse';

// GET /api/bids/sources/tenderned?page=&pageSize=&q=&cpv=&deadlineBefore=&newSince=
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const { searchParams } = new URL(request.url);
    // Map filters naar TNS (0-based page; size)
    const page = Number(searchParams.get('page') || '0');
    const pageSize = Number(searchParams.get('size') || searchParams.get('pageSize') || '20');
    const q = searchParams.get('q') || undefined; // niet gegarandeerd ondersteund; client-side matchen
    // Ondersteun zowel 'cpv' (comma/space separated) als meerdere 'cpvCodes'
    const cpvParam = searchParams.get('cpv') || '';
    const cpvCodes = searchParams.getAll('cpvCodes').concat(cpvParam.split(/[ ,;]+/).filter(Boolean));
    const publicatieType = searchParams.get('publicatieType') || undefined;
    const publicatieDatumVanaf = searchParams.get('from') || searchParams.get('publicatieDatumVanaf') || undefined;
    const publicatieDatumTot = searchParams.get('to') || searchParams.get('publicatieDatumTot') || undefined;

    const data = await fetchTenderNed(request as any, {
      page,
      pageSize,
      q,
      cpv: cpvCodes.join(','),
      // Map onze UI velden door naar TNS in fetchTenderNed
      deadlineBefore: searchParams.get('publicatieDatumTot') || undefined,
      newSince: searchParams.get('publicatieDatumVanaf') || undefined,
    });

    // Enrichment: direct XML ophalen voor alle items met gelimiteerde concurrency (5)
    const poolSize = 5;
    const items: any[] = Array.from({ length: data.items.length });
    let index = 0;
    async function worker() {
      while (index < data.items.length) {
        const i = index++;
        const it = data.items[i];
        try {
          const xml = await fetchTenderNedXml(String(it.id));
          const summary = parseEformsSummary(xml);
          // Sanity: als deadline < publicatie, laat deadline leeg (inconsistentie in bron)
          let submissionDeadline = it.submissionDeadline;
          if (summary?.deadlineDate) submissionDeadline = summary.deadlineDate;
          if (it.publicationDate && submissionDeadline) {
            try {
              const pub = new Date(it.publicationDate).getTime();
              const dl = new Date(submissionDeadline).getTime();
              if (!Number.isNaN(pub) && !Number.isNaN(dl) && dl < pub) {
                submissionDeadline = undefined;
              }
            } catch {}
          }
          items[i] = { ...it, ...summary, submissionDeadline };
        } catch {
          items[i] = it;
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(poolSize, data.items.length) }, worker));

    // Filter ContractAwardNotice uit CPV zoekresultaten (deze zijn al gegund)
    let filteredItems = items;
    const hasCPVFilter = cpvCodes.length > 0;
    if (hasCPVFilter) {
      filteredItems = items.filter((item: any) => {
        // ContractAwardNotice = al gegund, niet tonen in CPV zoekresultaten
        return item.tenderNoticeType !== 'ContractAwardNotice';
      });
      console.log(`[TenderNed] CPV filter active: Filtered out ${items.length - filteredItems.length} ContractAwardNotice items (already awarded)`);
    }

    const result = { success: true, items: filteredItems, page: data.page, nextPage: data.nextPage, total: data.totalElements, totalPages: data.totalPages, filters: { page, size: pageSize, publicatieType, publicatieDatumVanaf, publicatieDatumTot, cpvCodes } };
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('TenderNed API error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch TenderNed bids' }, { status: 500 });
  }
}