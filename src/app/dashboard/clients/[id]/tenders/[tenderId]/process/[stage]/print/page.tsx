'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PrintStagePage() {
  const { id: clientId, tenderId, stage } = useParams<{ id: string; tenderId: string; stage: string }>();
  const [html, setHtml] = useState('');
  const [refs, setRefs] = useState<Array<{ label: string; title?: string; url?: string; type?: string }>>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const metaRes = await fetch(`/api/clients/${clientId}/tenders`);
        const metaJson = await metaRes.json();
        const item = (metaJson.data || []).find((x: any) => x.id === tenderId);
        setTitle(item?.title || 'Aanbesteding');
        const bidId = item?.bid?.id;
        if (!bidId) return;
        const res = await fetch(`/api/bids/${bidId}/stages/${stage}`);
        const json = await res.json();
        setHtml(String(json.data?.content || ''));
        const s = Array.isArray(json.data?.sources) ? json.data.sources : [];
        setRefs(s);
        setTimeout(() => window.print(), 800);
      } catch {}
    })();
  }, [clientId, tenderId, stage]);

  const styledHtml = useMemo(() => {
    return `<!doctype html><html><head><meta charset="utf-8"/><title>${title} – ${stage}</title>
    <style>
      body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; color:#111827;}
      .container{max-width:850px;margin:40px auto;}
      h1,h2,h3{margin:16px 0 8px}
      p{line-height:1.6;margin:8px 0}
      ul,ol{margin:8px 0 8px 24px}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
      code{background:#f3f4f6;padding:2px 4px;border-radius:4px}
      .refs li{margin:4px 0}
    </style>
    </head><body><div class="container">
      <h1>${title} – ${stage}</h1>
      <div>${html}</div>
      ${refs.length ? `<h2>Referenties</h2><ul class="refs">${refs.map(r=>`<li>[${r.label}] ${r.title||r.url||''}</li>`).join('')}</ul>` : ''}
    </div></body></html>`;
  }, [html, refs, stage, title]);

  return (
    <iframe srcDoc={styledHtml} style={{ width: '100%', height: '100vh', border: 'none' }} />
  );
}
