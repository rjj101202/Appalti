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
  const items: TenderNedItem[] = (raw.items || raw.results || raw || []).map((r: any) => ({
    id: r.id || r.noticeId || r.reference || String(r._id || ''),
    title: r.title || r.subject || r.description || 'Untitled',
    buyer: r.buyer?.name || r.organisation || r.contractingAuthority || undefined,
    cpvCodes: Array.isArray(r.cpvCodes) ? r.cpvCodes : (r.cpv ? [r.cpv] : undefined),
    sector: r.sector || r.market || undefined,
    publicationDate: r.publicationDate || r.publishedAt || r.datePublished || undefined,
    submissionDeadline: r.submissionDeadline || r.deadline || r.tenderDeadline || undefined,
    sourceUrl: r.url || r.link || undefined,
  }));

  const nextPage = items.length === pageSize ? page + 1 : undefined;
  return { items, page, nextPage };
}

