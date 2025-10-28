'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Link from 'next/link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

type Stage = 'storyline' | 'version_65' | 'version_95' | 'final';

export default function StageEditorPage() {
  const { id: clientId, tenderId, stage } = useParams<{ id: string; tenderId: string; stage: Stage }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [revLoading, setRevLoading] = useState(false);
  const [contacts, setContacts] = useState<{ _id: string; name: string; email?: string }[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [stageStatus, setStageStatus] = useState<string>('');
  const [assignedReviewer, setAssignedReviewer] = useState<{ id: string; name: string; email?: string }|null>(null);
  const [tenderExternalId, setTenderExternalId] = useState<string>('');
  const tenderLink = useMemo(() => tenderExternalId ? `https://www.tenderned.nl/aankondigingen/overzicht/${encodeURIComponent(tenderExternalId)}` : '', [tenderExternalId]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceLinks, setSourceLinks] = useState<string[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none prose-headings:scroll-mt-24 prose-h1:mb-3 prose-h2:mt-6 prose-h2:mb-2 prose-p:leading-7 prose-li:my-1'
      }
    }
  });

  const bidIdFromQuery = async (): Promise<string | undefined> => {
    try {
      const res = await fetch(`/api/clients/${clientId}/tenders`);
      const json = await res.json();
      if (!res.ok || !json.success) return undefined;
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      return item?.bid?.id;
    } catch { return undefined; }
  };

  const load = async () => {
    try {
      setLoading(true);
      // Haal bid + tender meta op
      const meta = await (async (): Promise<{ bidId?: string; externalId?: string }> => {
        try {
          const res = await fetch(`/api/clients/${clientId}/tenders`);
          const json = await res.json();
          if (!res.ok || !json.success) return {};
          const item = (json.data || []).find((x: any) => x.id === tenderId);
          return { bidId: item?.bid?.id, externalId: item?.externalId };
        } catch { return {}; }
      })();
      const bidId = meta.bidId;
      if (!bidId) throw new Error('Bid niet gevonden');
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
      const html = String(json.data?.content || '');
      setAttachments(json.data?.attachments || []);
      setStageStatus(json.data?.status || '');
      setTenderExternalId(meta.externalId || '');
      setSourceLinks(json.data?.sourceLinks || []);
      // assigned reviewer/status ophalen uit server data als beschikbaar
      // (deze endpoint retourneert dit nog niet; we houden UI reactief na toewijzen)
      if (editor) editor.commands.setContent(html || '<p></p>');
    } catch (e: any) {
      setError(e?.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clientId, tenderId, stage]);

  const save = async () => {
    try {
      setSaving(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const html = editor?.getHTML() || '';
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: html }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Opslaan mislukt');
      alert('Opgeslagen');
    } catch (e: any) { alert(e?.message || 'Opslaan mislukt'); }
    finally { setSaving(false); }
  };

  const toPlain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\n{3,}/g,'\n\n');

  const doSearch = async (q: string) => {
    try {
      setSearching(true);
      const params = new URLSearchParams({ q, scope: 'vertical', companyId: String(clientId), topK: '8' });
      const res = await fetch(`/api/knowledge/search?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Zoeken mislukt');
      setResults(json.data.results || []);
    } catch (e: any) { alert(e?.message || 'Zoeken mislukt'); }
    finally { setSearching(false); }
  };

  const generateWithRag = async () => {
    try {
      setGenLoading(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/ai/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Genereren mislukt');
      const next = (editor?.getHTML() || '') + `\n<p>\n</p>` + (json.data.generatedText || '').split('\n').map(l => `<p>${l}</p>`).join('');
      editor?.commands.setContent(next);
    } catch (e: any) { alert(e?.message || 'Genereren mislukt'); }
    finally { setGenLoading(false); }
  };

  const runAiReview = async () => {
    try {
      setRevLoading(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const html = editor?.getHTML() || '';
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/review/paragraphs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: html, max: 10 }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'AI review mislukt');
      setSuggestions(json.data.suggestions || []);
    } catch (e: any) { alert(e?.message || 'AI review mislukt'); }
    finally { setRevLoading(false); }
  };

  const [suggestions, setSuggestions] = useState<any[]>([]);

  const applySuggestion = (s: any, mode: 'replace'|'append') => {
    const currentHtml = editor?.getHTML() || '';
    function escapeHtml(input: string): string {
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
    if (mode === 'append') {
      const next = currentHtml + `<p>${escapeHtml(String(s.improved || ''))}</p>`;
      editor?.commands.setContent(next);
      return;
    }
    // Replace: behoud overige inhoud en vervang alleen de n-de paragraaf
    try {
      const container = document.createElement('div');
      container.innerHTML = currentHtml;
      const pNodes = container.querySelectorAll('p');
      const idx = Number(s.index);
      if (idx >= 0 && idx < pNodes.length) {
        const p = pNodes[idx] as HTMLParagraphElement;
        p.textContent = String(s.improved || '');
      } else {
        const p = document.createElement('p');
        p.textContent = String(s.improved || '');
        container.appendChild(p);
      }
      const next = container.innerHTML;
      editor?.commands.setContent(next || currentHtml);
    } catch {
      // Fallback: voeg toe indien DOM parsing niet lukt
      const next = currentHtml + `<p>${escapeHtml(String(s.improved || ''))}</p>`;
      editor?.commands.setContent(next);
    }
  };

  const loadContacts = async () => {
    try {
      const [resContacts, resMembers] = await Promise.all([
        fetch(`/api/client-companies/${clientId}/contacts`),
        fetch(`/api/clients/${clientId}/members`)
      ]);
      let list: { _id: string; name: string; email?: string }[] = [];
      if (resContacts.ok) {
        const json = await resContacts.json();
        if (json.success) list = (json.data || []) as any[];
      }
      if (resMembers.ok) {
        const mj = await resMembers.json();
        if (mj.success) {
          const mapped = (mj.data || []).map((m: any) => ({ _id: m.userId, name: m.name || m.email || 'Gebruiker', email: m.email }));
          list = [...list, ...mapped];
        }
      }
      // Dedupliceer op id/email
      const dedup = new Map<string, any>();
      for (const c of list) {
        const key = c._id || c.email || Math.random().toString(36);
        if (!dedup.has(key)) dedup.set(key, c);
      }
      setContacts(Array.from(dedup.values()));
    } catch {}
  };
  useEffect(() => { loadContacts(); /* eslint-disable-next-line */ }, [clientId]);

  const assignReviewer = async () => {
    try {
      if (!reviewerId) return alert('Kies reviewer');
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const contact = contacts.find(c => c._id === reviewerId);
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/assign-reviewer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewerId, name: contact?.name || 'Reviewer', email: contact?.email }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Toewijzen mislukt');
      setAssignedReviewer({ id: reviewerId, name: contact?.name || '', email: contact?.email });
      setStageStatus('pending_review');
      alert('Reviewer toegewezen');
    } catch (e: any) { alert(e?.message || 'Toewijzen mislukt'); }
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Upload mislukt');
      setAttachments(prev => [...prev, { name: file.name, url: json.url, size: (file as any).size, type: (file as any).type }]);
    } catch (e: any) {
      alert(e?.message || 'Upload mislukt');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', padding: '3rem' }}>Laden...</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="error-message">{error}</div>
          <Link href={`/dashboard/clients/${clientId}/tenders/${tenderId}/process`} className="btn btn-secondary" style={{ marginTop: '1rem' }}>← Terug</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <button className="btn btn-secondary" onClick={() => router.push(`/dashboard/clients/${clientId}/tenders/${tenderId}/process`)}>← Terug</button>
        <h1 style={{ marginTop: '1rem' }}>Bewerken – {stageLabel(stage)}</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
              <button className="btn btn-secondary" onClick={generateWithRag} disabled={genLoading}>{genLoading ? 'Genereren...' : 'Genereer met AI (RAG)'}</button>
            </div>
            {/* Rich editor */}
            <div className="card" style={{ padding: '0.5rem' }}>
              <Toolbar editor={editor} />
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 500, padding: 12, background: '#fff' }}>
                {editor && <EditorContent editor={editor} />}
              </div>
            </div>
            {/* Design hulp: stijlgids voor consistente opmaak */}
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3>Stijlgids (versie‑specifiek)</h3>
              <ul style={{ color: '#6b7280' }}>
                <li>Gebruik H2 voor hoofddelen, H3 voor subsecties.</li>
                <li>Gebruik opsommingen voor eisen en aanpak.</li>
                <li>Voeg citaties [S1], [S2] toe bij claims; bewijs is verplicht.</li>
              </ul>
            </div>
            {/* Bronnen & Referenties */}
            {(tenderLink || (sourceLinks && sourceLinks.length)) && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Referenties</h3>
                <ul>
                  {tenderLink && <li><a href={tenderLink} target="_blank" rel="noreferrer">Aankondiging op TenderNed</a></li>}
                  {sourceLinks.map((u, i) => (
                    <li key={i}><a href={u} target="_blank" rel="noreferrer">{u}</a></li>
                  ))}
                </ul>
              </div>
            )}
            {/* Bijlagen + Upload */}
            <div style={{ marginTop: '1rem' }}>
              <h3>Bijlagen</h3>
              <div style={{ marginBottom: 8 }}>
                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Uploaden...' : 'Upload bijlage'}</button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value=''; }} />
              </div>
              {attachments && attachments.length > 0 && (
                <ul>
                  {attachments.map((a, i) => (<li key={i}><a href={a.url} target="_blank" rel="noreferrer">{a.name || a.url}</a></li>))}
                </ul>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Zoek bronnen */}
            <div className="card" style={{ padding: '0.75rem' }}>
              <h3>Zoek bronnen</h3>
              <input placeholder="Zoek in documenten" onKeyDown={e => { if (e.key==='Enter') doSearch((e.target as HTMLInputElement).value); }} style={{ width: '100%', marginBottom: 8 }} />
              <button className="btn btn-secondary" onClick={() => doSearch(prompt('Zoekterm') || '')} disabled={searching}>{searching?'Zoeken...':'Zoek'}</button>
              <ul style={{ marginTop: 8 }}>
                {results.map((r:any,i:number)=> (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: '0.9em' }}>{r.text?.slice(0,180)}...</div>
                    {r.document?.title && <div style={{ color: '#6b7280' }}>{r.document.title}</div>}
                  </li>
                ))}
              </ul>
            </div>
            {/* AI review */}
            <div className="card" style={{ padding: '0.75rem' }}>
              <h3>AI‑review (per alinea)</h3>
              <button className="btn btn-secondary" onClick={runAiReview} disabled={revLoading}>{revLoading?'Controleren...':'Analyseer tekst'}</button>
              <ul style={{ marginTop: 8 }}>
                {suggestions.map((s:any,i:number)=> (
                  <li key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Alinea {s.index}: {s.diagnose}</div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95em', borderLeft: '2px solid #e5e7eb', paddingLeft: 8, marginTop: 4 }}>{s.improved}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button className="btn btn-secondary" onClick={()=>applySuggestion(s,'replace')}>Vervang alinea</button>
                      <button className="btn btn-secondary" onClick={()=>applySuggestion(s,'append')}>Voeg toe onderaan</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* Reviewer */}
            <div className="card" style={{ padding: '0.75rem' }}>
              <h3>Beoordeling door Intergarde</h3>
              <div style={{ fontSize: '0.9em', marginBottom: 6 }}>Status: {stageStatus || 'draft'}</div>
              {assignedReviewer && <div style={{ fontSize: '0.9em', marginBottom: 6 }}>Reviewer: {assignedReviewer.name} ({assignedReviewer.email || 'n/a'})</div>}
              <select value={reviewerId} onChange={e=>setReviewerId(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
                <option value="">Kies reviewer...</option>
                {contacts.map(c => (<option key={c._id} value={c._id}>{c.name}{c.email?` (${c.email})`:''}</option>))}
              </select>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary" onClick={assignReviewer}>Toewijzen & Ter review</button>
                <Link href={`/dashboard/clients/${clientId}`} className="btn btn-secondary">Team beheren</Link>
              </div>
            </div>
          </div>
        </div>
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

function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleUnderline?.().run?.()}><u>U</u></button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleBulletList().run()}>• Lijst</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Lijst</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Clear</button>
    </div>
  );
}

