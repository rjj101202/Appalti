import { checkRateLimit } from '@/lib/rate-limit';

export interface TenderNedItem {
  id: string;
  title: string;
  buyer?: string;
  cpvCodes?: string[];
  sector?: string;
  publicationDate?: string;
  submissionDeadline?: string;
  sourceUrl?: string;
}

export interface FetchTenderNedOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  cpv?: string;
  deadlineBefore?: string;
  newSince?: string;
}

function getEnv(name: string, optional = false): string | undefined {
  const value = process.env[name];
  if (!value && !optional) throw new Error(`Missing env ${name} (configure in Vercel Project Settings)`);
  return value;
}

export async function fetchTenderNed(request: Request, opts: FetchTenderNedOptions = {}) {
  // Basic rate limit per IP/user
  try { await checkRateLimit(undefined as any, 'tenderned:fetch'); } catch {/* best-effort */}

  const baseUrl = getEnv('TENDERNED_API_URL')!;
  const apiPath = (getEnv('TENDERNED_API_PATH', true) || '').toString().trim();
  const username = getEnv('TENDERNED_USERNAME')!;
  const password = getEnv('TENDERNED_PASSWORD')!;

  const page = Math.max(0, Number(opts.page ?? 0));
  const pageSize = Math.min(50, Math.max(1, Number(opts.pageSize || (opts as any).size || 20)));

  // Build URL: allow override path via env; otherwise add sensible default if base ends with /v2
  let effectiveBase = baseUrl;
  try {
    const u = new URL(baseUrl);
    const endsWithV2 = /\/(v2|V2)\/?$/.test(u.pathname);
    if (apiPath) {
      u.pathname = u.pathname.replace(/\/?$/, '/') + apiPath.replace(/^\//, '');
    } else if (endsWithV2) {
      // Default resource path used door TenderNed publicaties API
      u.pathname = u.pathname.replace(/\/?$/, '/') + 'publicaties';
    }
    effectiveBase = u.toString();
  } catch {/* keep base as-is */}

  const url = new URL(effectiveBase);
  url.searchParams.set('page', String(page));
  url.searchParams.set('size', String(pageSize));
  if (opts.q) url.searchParams.set('q', opts.q);
  if (opts.cpv) {
    const codes = String(opts.cpv).split(/[ ,;]+/).filter(Boolean);
    for (const code of codes) url.searchParams.append('cpvCodes', code);
  }
  // Map onze generieke namen naar TenderNed TNS filters
  if (opts.newSince) url.searchParams.set('publicatieDatumVanaf', opts.newSince);
  if (opts.deadlineBefore) url.searchParams.set('publicatieDatumTot', opts.deadlineBefore);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      Accept: 'application/json'
    },
    // 10s timeout via AbortController if needed (left simple for now)
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TenderNed fetch failed (${res.status}): ${text} | url=${url.toString()}`);
  }
  const raw = await res.json();
  // Extract array of publications robustly
  const extractArray = (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      // Common keys
      for (const key of ['items','results','content','publications','data']) {
        if (Array.isArray(value[key])) return value[key];
      }
      // HAL or nested arrays: take first array value we find
      for (const v of Object.values(value)) {
        if (Array.isArray(v)) return v;
        if (v && typeof v === 'object') {
          const inner = extractArray(v);
          if (Array.isArray(inner) && inner.length) return inner;
        }
      }
    }
    return [];
  };

  const list = extractArray(raw);
  // Log eenmalig een sample van keys om mapping te verfijnen (geen PII, alleen sleutel‑namen)
  try {
    if (list && list.length) {
      const sample = list[0] || {};
      const keys = Object.keys(sample).slice(0, 30);
      console.log('[TenderNed] sample keys:', keys);
    } else {
      console.log('[TenderNed] empty list or unexpected payload shape');
    }
  } catch {/* no-op */}
  const items: TenderNedItem[] = list.map((r: any) => {
    const link = r.link && typeof r.link === 'object' ? (r.link.href || r.link.url) : r.link;
    const srcUrl = (r.sourceUrl && typeof r.sourceUrl === 'object' ? (r.sourceUrl.href || r.sourceUrl.url) : r.sourceUrl)
      || r.url || link || r.detailUrl || r.publicatieUrl || undefined;

    // Titel: probeer diverse sleutelvarianten voordat we op id vallen
    const title = r.title || r.titel || r.publicatieTitel || r.aankondigingTitel || r.aanbestedingNaam || r.onderwerp || r.subject || r.description || r.naam || (typeof r.link === 'object' ? r.link?.title : undefined) || String(r.id || r.publicatieId || 'Untitled');

    return {
      id: r.id || r.publicatieId || r.publicationId || r.noticeId || r.reference || String(r._id || ''),
      title,
      buyer: r.buyer?.name || r.organisation || r.contractingAuthority || r.aanbestedendeDienst || r.aanbestedendeDienstNaam || r.organisatieNaam || r.opdrachtgeverNaam || undefined,
      cpvCodes: Array.isArray(r.cpvCodes) ? r.cpvCodes : (r.cpv ? [r.cpv] : (r.cpvCode ? [r.cpvCode] : (r.cpvCodes?.code ? [r.cpvCodes.code] : undefined))),
      sector: r.sector || r.market || r.domein || r.sectorOmschrijving || undefined,
      publicationDate: r.publicationDate || r.publicatieDatum || r.publishedAt || r.datePublished || r.datumPublicatie || undefined,
      submissionDeadline: r.submissionDeadline || r.sluitingsDatum || r.sluitingsTermijn || r.deadline || r.tenderDeadline || undefined,
      sourceUrl: srcUrl,
    } as TenderNedItem;
  });

  const nextPage = items.length === pageSize ? page + 1 : undefined;
  const totalElements = (raw && (raw.totalElements || raw.page?.totalElements || raw.total)) || undefined;
  const totalPages = (raw && (raw.totalPages || raw.page?.totalPages)) || undefined;
  return { items, page, nextPage, totalElements, totalPages };
}

