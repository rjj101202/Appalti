import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { XMLParser } from 'fast-xml-parser';

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// GET /api/bids/sources/tenderned/:id - fetch XML detail (requires Basic Auth)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const base = getEnv('TENDERNED_API_URL');
    const username = getEnv('TENDERNED_USERNAME');
    const password = getEnv('TENDERNED_PASSWORD');
    const url = `${base.replace(/\/?$/, '')}/publicaties/${encodeURIComponent(params.id)}/public-xml`;

    const res = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        Accept: 'application/xml, text/xml, */*'
      },
      cache: 'no-store'
    });
    const text = await res.text();
    if (!res.ok) return new NextResponse(text || 'Failed to fetch XML', { status: res.status, headers: { 'Content-Type': 'text/plain' } });

    // raw passthrough (handig om veldnamen te inspecteren)
    const { searchParams } = new URL(request.url);
    if (searchParams.has('raw')) {
      return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    // Parseer XML naar compacte samenvatting (neutraal op namespaces)
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });
    let summary: any = {};
    try {
      const xml = parser.parse(text);
      // helper: depth-first search for tag names containing TITLE / SHORT_DESCR / DESCRIPTION (case-insensitive, namespace-agnostic)
      const findFirst = (node: any, matchers: ((k: string) => boolean)[]): string | undefined => {
        if (!node || typeof node !== 'object') return undefined;
        for (const [k, v] of Object.entries(node)) {
          if (typeof v === 'string') {
            if (matchers.some(fn => fn(k))) return v;
          } else if (v && typeof v === 'object') {
            const maybe = findFirst(v, matchers);
            if (maybe) return maybe;
          }
        }
        return undefined;
      };
      const has = (needle: string) => (k: string) => k.toLowerCase().endsWith(needle) || k.toLowerCase().includes(':'+needle);
      const title = findFirst(xml, [has('title')]);
      const shortDescription = findFirst(xml, [has('short_descr'), has('shortdescription'), has('description')]);
      summary = { title, shortDescription };
    } catch {}

    return NextResponse.json({ success: true, summary, rawXmlAvailable: true });
  } catch (e: any) {
    console.error('TenderNed XML error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch TenderNed XML' }, { status: 500 });
  }
}

