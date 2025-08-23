'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [revLoading, setRevLoading] = useState(false);
  const [contacts, setContacts] = useState<{ _id: string; name: string; email?: string }[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [stageStatus, setStageStatus] = useState<string>('');
  const [assignedReviewer, setAssignedReviewer] = useState<{ id: string; name: string; email?: string }|null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color],
    content: '<p></p>',
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
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
      const html = String(json.data?.content || '');
      setAttachments(json.data?.attachments || []);
      setStageStatus(json.data?.status || '');
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
    const html = editor?.getHTML() || '';
    const plain = toPlain(html);
    const paragraphs = plain.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    if (mode === 'replace') {
      const idx = s.index;
      if (paragraphs[idx]) paragraphs[idx] = s.improved;
    } else {
      paragraphs.push(s.improved);
    }
    const nextHtml = paragraphs.map((p: string) => `<p>${p}</p>`).join('');
    editor?.commands.setContent(nextHtml);
  };

  const loadContacts = async () => {
    try {
      const res = await fetch(`/api/client-companies/${clientId}/contacts`);
      const json = await res.json();
      if (res.ok && json.success) setContacts(json.data || []);
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
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 400, padding: 8 }}>
                {editor && <EditorContent editor={editor} />}
              </div>
            </div>
            {attachments && attachments.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Bijlagen</h3>
                <ul>
                  {attachments.map((a, i) => (<li key={i}><a href={a.url} target="_blank" rel="noreferrer">{a.name || a.url}</a></li>))}
                </ul>
              </div>
            )}
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

