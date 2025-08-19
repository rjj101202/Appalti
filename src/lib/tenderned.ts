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

  const page = Math.max(1, Number(opts.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(opts.pageSize || 20)));

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
  url.searchParams.set('pageSize', String(pageSize));
  if (opts.q) url.searchParams.set('q', opts.q);
  if (opts.cpv) url.searchParams.set('cpv', opts.cpv);
  if (opts.deadlineBefore) url.searchParams.set('deadlineBefore', opts.deadlineBefore);
  if (opts.newSince) url.searchParams.set('newSince', opts.newSince);

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
  const items: TenderNedItem[] = list.map((r: any) => ({
    id: r.id || r.publicatieId || r.publicationId || r.noticeId || r.reference || String(r._id || ''),
    title: r.title || r.titel || r.publicatieTitel || r.aankondigingTitel || r.subject || r.description || String(r.id || r.publicatieId || 'Untitled'),
    buyer: r.buyer?.name || r.organisation || r.contractingAuthority || r.aanbestedendeDienst || r.aanbestedendeDienstNaam || r.organisatieNaam || undefined,
    cpvCodes: Array.isArray(r.cpvCodes) ? r.cpvCodes : (r.cpv ? [r.cpv] : (r.cpvCode ? [r.cpvCode] : (r.cpvCodes?.code ? [r.cpvCodes.code] : undefined))),
    sector: r.sector || r.market || r.domein || r.sectorOmschrijving || undefined,
    publicationDate: r.publicationDate || r.publicatieDatum || r.publishedAt || r.datePublished || r.datumPublicatie || undefined,
    submissionDeadline: r.submissionDeadline || r.sluitingsDatum || r.sluitingsTermijn || r.deadline || r.tenderDeadline || undefined,
    sourceUrl: (r.sourceUrl && typeof r.sourceUrl === 'object' ? (r.sourceUrl.href || r.sourceUrl.url) : undefined)
      || r.url || r.link || r.detailUrl || r.publicatieUrl || undefined,
  }));

  const nextPage = items.length === pageSize ? page + 1 : undefined;
  return { items, page, nextPage };
}

