'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

type Stage = 'storyline' | 'version_65' | 'version_95' | 'final';

export default function StageEditorPage() {
  const { id: clientId, tenderId, stage } = useParams<{ id: string; tenderId: string; stage: Stage }>();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  const bidIdFromQuery = async (): Promise<string | undefined> => {
    try {
      const res = await fetch(`/api/clients/${clientId}/tenders`);
      const json = await res.json();
      if (!res.ok || !json.success) return undefined;
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      return item?.bid?.id;
    } catch { return undefined; }
  };

  const tenderExternalId = async (): Promise<string | undefined> => {
    try {
      const res = await fetch(`/api/clients/${clientId}/tenders`);
      const json = await res.json();
      if (!res.ok || !json.success) return undefined;
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      return item?.externalId;
    } catch { return undefined; }
  };

  const load = async () => {
    try {
      setLoading(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
      setContent(json.data?.content || '');
      setAttachments(json.data?.attachments || []);
    } catch (e: any) {
      setError(e?.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clientId, tenderId, stage]);

  const save = async () => {
    try {
      setSaving(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Opslaan mislukt');
      alert('Opgeslagen');
    } catch (e: any) { alert(e?.message || 'Opslaan mislukt'); }
    finally { setSaving(false); }
  };

  const aiDraft = async () => {
    try {
      setAiLoading(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/ai/draft`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'AI genereren mislukt');
      const draft = json.data?.draft || '';
      setContent(prev => (prev ? prev + '\n\n' : '') + draft);
    } catch (e: any) { alert(e?.message || 'AI genereren mislukt'); }
    finally { setAiLoading(false); }
  };

  const onUpload = async (file: File) => {
    try {
      setUploading(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/upload`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Upload mislukt');
      await load();
    } catch (e: any) { alert(e?.message || 'Upload mislukt'); }
    finally { setUploading(false); }
  };

  return (
    <DashboardLayout>
      <div className="page-container">
        <button className="btn btn-secondary" onClick={() => router.push(`/dashboard/clients/${clientId}/tenders/${tenderId}/process`)}>← Terug</button>
        <h1 style={{ marginTop: '1rem' }}>Bewerken – {stageLabel(stage)}</h1>
        {loading && <p>Laden...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && !error && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
              <button className="btn btn-secondary" onClick={aiDraft} disabled={aiLoading}>{aiLoading ? 'AI genereert...' : 'Genereer met AI'}</button>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                {uploading ? 'Uploaden...' : 'Upload document'}
                <input type="file" style={{ display: 'none' }} onChange={e => e.target.files && onUpload(e.target.files[0])} />
              </label>
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)} style={{ width: '100%', minHeight: 400 }} />
            {attachments && attachments.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Bijlagen</h3>
                <ul>
                  {attachments.map((a, i) => (
                    <li key={i}><a href={a.url} target="_blank" rel="noreferrer">{a.name || a.url}</a></li>
                  ))}
                </ul>
              </div>
            )}
            <TenderSources clientId={clientId} tenderId={tenderId} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function stageLabel(stage: Stage) {
  switch (stage) {
    case 'storyline': return 'Storyline';
    case 'version_65': return '65% versie';
    case 'version_95': return '95% versie';
    case 'final': return 'Finish';
  }
}

function TenderSources({ clientId, tenderId }: { clientId: string; tenderId: string }) {
  const [extId, setExtId] = useState<string | undefined>(undefined);
  const [links, setLinks] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/tenders`);
        const json = await res.json();
        if (res.ok && json.success) {
          const item = (json.data || []).find((x: any) => x.id === tenderId);
          const externalId = item?.externalId;
          setExtId(externalId);
          if (externalId) {
            const xmlRes = await fetch(`/api/bids/sources/tenderned/${externalId}`);
            const xmlJson = await xmlRes.json();
            if (xmlRes.ok && xmlJson.success) {
              const docLinks = Array.isArray(xmlJson.summary?.documentLinks) ? xmlJson.summary.documentLinks : [];
              setLinks(docLinks);
            }
          }
        }
      } catch {}
    })();
  }, [clientId, tenderId]);
  if (!extId && links.length === 0) return null;
  return (
    <div style={{ marginTop: '1rem' }}>
      <h3>Bronnen</h3>
      <ul>
        {extId && (
          <li><a href={`https://www.tenderned.nl/aankondigingen/overzicht/${encodeURIComponent(extId)}`} target="_blank" rel="noreferrer">TenderNed aankondiging</a></li>
        )}
        {links.map((u, i) => (
          <li key={i}><a href={u} target="_blank" rel="noreferrer">{u}</a></li>
        ))}
      </ul>
    </div>
  );
}

