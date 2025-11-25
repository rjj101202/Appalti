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
import TiptapLink from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlock from '@tiptap/extension-code-block';

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
  const [useAppaltiBron, setUseAppaltiBron] = useState(true);
  const [contacts, setContacts] = useState<{ _id: string; name: string; email?: string }[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [stageStatus, setStageStatus] = useState<string>('');
  const [assignedReviewer, setAssignedReviewer] = useState<{ id: string; name: string; email?: string }|null>(null);
  const [tenderExternalId, setTenderExternalId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const tenderLink = useMemo(() => tenderExternalId ? `https://www.tenderned.nl/aankondigingen/overzicht/${encodeURIComponent(tenderExternalId)}` : '', [tenderExternalId]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceLinks, setSourceLinks] = useState<string[]>([]);
  const [sources, setSources] = useState<Array<{ label: string; type: 'client'|'tender'|'xai'|'attachment'; title?: string; url?: string; snippet?: string; documentId?: any; chunks?: Array<{ index: number; pageNumber?: number }> }>>([]);

  // Criteria state (nieuwe structuur)
  const [criteria, setCriteria] = useState<Array<{ id: string; title: string; content: string; aiContext?: string; order: number }>>([]);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Leidraad document & extracted data
  const [leidraadDocument, setLeidraadDocument] = useState<{ name: string; url: string; uploadedAt?: Date } | null>(null);
  const [uploadingLeidraad, setUploadingLeidraad] = useState(false);
  const [extractingCriteria, setExtractingCriteria] = useState(false);
  const [extractingKeyData, setExtractingKeyData] = useState(false);
  const [extractedCriteria, setExtractedCriteria] = useState<Array<{ title: string; weight?: number; subQuestions: string[] }>>([]);
  const [extractedKeyData, setExtractedKeyData] = useState<Array<{ category: string; items: Array<{ label: string; value: string }> }>>([]);
  const leidraadInputRef = useRef<HTMLInputElement>(null);

  // Hover preview tooltip state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverText, setHoverText] = useState<string>('');
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Right-side inspector state
  const [inspector, setInspector] = useState<{ open: boolean; title?: string; content?: { prev?: string|null; focus?: string|null; next?: string|null } | null }>({ open: false, content: null });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TiptapLink.configure({ openOnClick: true, autolink: true }),
      Image.configure({ inline: false }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlock
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none prose-headings:scroll-mt-24 prose-h1:mb-3 prose-h2:mt-6 prose-h2:mb-2 prose-p:leading-7 prose-li:my-1'
      }
    },
    onUpdate: () => {
      setHasUnsavedChanges(true);
    }
  });

  // Ensure inline references like [S1] are wrapped for hover previews
  const decorateCitationsInHtml = (html: string): string => {
    try {
      return String(html || '').replace(/\[(S\d+)\]/g, (_m, g1) => `<span class="citation" data-label="${g1}" style="text-decoration:underline dotted; cursor:help">[${g1}]</span>`);
    } catch { return html; }
  };

  const bidIdFromQuery = async (): Promise<string | undefined> => {
    try {
      const res = await fetch(`/api/clients/${clientId}/tenders`, { cache: 'no-store' });
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
      const meta = await (async (): Promise<{ bidId?: string; externalId?: string, clientName?: string }> => {
        try {
          const res = await fetch(`/api/clients/${clientId}/tenders`, { cache: 'no-store' });
          const json = await res.json();
          if (!res.ok || !json.success) return {};
          const item = (json.data || []).find((x: any) => x.id === tenderId);
          // clientName ophalen
          let name = '';
          try {
            const r2 = await fetch(`/api/clients/${clientId}`, { cache: 'no-store' });
            const j2 = await r2.json();
            if (r2.ok && j2.success) name = j2.data?.name || '';
          } catch {}
          return { bidId: item?.bid?.id, externalId: item?.externalId, clientName: name };
        } catch { return {}; }
      })();
      const bidId = meta.bidId;
      if (!bidId) throw new Error('Bid niet gevonden');
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
      
      // Laad criteria
      const loadedCriteria = json.data?.criteria || [];
      
      // Backwards compatible: als er geen criteria zijn maar wel oude content, maak een default criterium
      if (loadedCriteria.length === 0 && json.data?.content) {
        const oldContent = String(json.data.content || '');
        if (oldContent.length > 0) {
          console.log('[MIGRATION] Creating default criterion from old content');
          loadedCriteria.push({
            id: 'temp-' + Date.now(),
            title: 'Algemeen',
            content: oldContent,
            order: 0
          });
        }
      }
      
      // Als er nog steeds geen criteria zijn, maak een leeg criterium
      if (loadedCriteria.length === 0) {
        loadedCriteria.push({
          id: 'temp-' + Date.now(),
          title: 'Algemeen',
          content: '<p></p>',
          order: 0
        });
      }
      
      setCriteria(loadedCriteria);
      
      // Selecteer het eerste criterium
      const firstCriterion = loadedCriteria[0];
      setSelectedCriterionId(firstCriterion.id);
      
      setAttachments(json.data?.attachments || []);
      setStageStatus(json.data?.status || '');
      setTenderExternalId(meta.externalId || '');
      setClientName(meta.clientName || '');
      setSourceLinks(json.data?.sourceLinks || []);
      setSources(json.data?.sources || []);
      
      // Load leidraad document en extracted data
      setLeidraadDocument(json.data?.leidraadDocument || null);
      setExtractedCriteria(json.data?.extractedCriteria || []);
      setExtractedKeyData(json.data?.extractedKeyData || []);
      
      // Log voor debugging
      console.log('[LOAD] Loaded', loadedCriteria.length, 'criteria');
      console.log('[LOAD] Selected criterion:', firstCriterion.title);
      
      // Zet content van eerste criterium in editor
      if (editor) {
        try {
          const decoratedHtml = decorateCitationsInHtml(firstCriterion.content || '<p></p>');
          editor.commands.setContent(decoratedHtml);
          console.log('[LOAD] Content set successfully');
        } catch (e) {
          console.error('[LOAD] Failed to set content:', e);
          editor.commands.setContent(firstCriterion.content || '<p></p>');
        }
      } else {
        console.warn('[LOAD] Editor not ready yet');
      }
    } catch (e: any) {
      setError(e?.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (editor) {
      load(); 
    }
    /* eslint-disable-next-line */ 
  }, [clientId, tenderId, stage, editor]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const save = async () => {
    try {
      setSaving(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      
      if (!selectedCriterionId) throw new Error('Geen criterium geselecteerd');
      
      const html = editor?.getHTML() || '';
      const selectedCriterion = criteria.find(c => c.id === selectedCriterionId);
      if (!selectedCriterion) throw new Error('Criterium niet gevonden');
      
      // Update lokale state
      setCriteria(prev => prev.map(c => 
        c.id === selectedCriterionId ? { ...c, content: html } : c
      ));
      
      // Check of het een temp ID is (nog niet in database)
      if (selectedCriterion.id.startsWith('temp-')) {
        // Maak nieuw criterium aan
        const res = await fetch(`/api/bids/${bidId}/stages/${stage}/criteria`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            title: selectedCriterion.title, 
            content: html,
            aiContext: selectedCriterion.aiContext || '',
            order: selectedCriterion.order 
          }) 
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Opslaan mislukt');
        
        // Update lokale state met echte ID
        const newCriterion = json.data.criterion;
        setCriteria(prev => prev.map(c => 
          c.id === selectedCriterionId ? { ...newCriterion } : c
        ));
        setSelectedCriterionId(newCriterion.id);
      } else {
        // Update bestaand criterium
        const res = await fetch(`/api/bids/${bidId}/stages/${stage}/criteria/${selectedCriterionId}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ content: html, aiContext: selectedCriterion.aiContext }) 
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Opslaan mislukt');
      }
      
      setHasUnsavedChanges(false);
      alert('Opgeslagen');
    } catch (e: any) { alert(e?.message || 'Opslaan mislukt'); }
    finally { setSaving(false); }
  };

  const toPlain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\n{3,}/g,'\n\n');

  // Criterion management functions
  const addNewCriterion = () => {
    const newCriterion = {
      id: 'temp-' + Date.now(),
      title: `Criterium ${criteria.length + 1}`,
      content: '<p></p>',
      order: criteria.length
    };
    setCriteria(prev => [...prev, newCriterion]);
    setSelectedCriterionId(newCriterion.id);
    if (editor) editor.commands.setContent('<p></p>');
  };

  const deleteCriterion = async (criterionId: string) => {
    if (criteria.length === 1) {
      alert('Je moet minimaal 1 criterium hebben');
      return;
    }
    
    if (!confirm('Weet je zeker dat je dit criterium wilt verwijderen?')) return;
    
    try {
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      
      // Als het een temp ID is, gewoon uit state verwijderen
      if (criterionId.startsWith('temp-')) {
        setCriteria(prev => prev.filter(c => c.id !== criterionId));
        if (selectedCriterionId === criterionId) {
          const remaining = criteria.filter(c => c.id !== criterionId);
          if (remaining.length > 0) {
            setSelectedCriterionId(remaining[0].id);
            if (editor) editor.commands.setContent(remaining[0].content);
          }
        }
        return;
      }
      
      // Anders verwijder uit database
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/criteria/${criterionId}`, { 
        method: 'DELETE' 
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Verwijderen mislukt');
      
      setCriteria(prev => prev.filter(c => c.id !== criterionId));
      if (selectedCriterionId === criterionId) {
        const remaining = criteria.filter(c => c.id !== criterionId);
        if (remaining.length > 0) {
          setSelectedCriterionId(remaining[0].id);
          if (editor) editor.commands.setContent(remaining[0].content);
        }
      }
    } catch (e: any) {
      alert(e?.message || 'Verwijderen mislukt');
    }
  };

  const updateCriterionTitle = async (criterionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      alert('Titel mag niet leeg zijn');
      return;
    }
    
    try {
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      
      // Update lokale state
      setCriteria(prev => prev.map(c => 
        c.id === criterionId ? { ...c, title: newTitle } : c
      ));
      
      // Als het een temp ID is, alleen lokaal updaten
      if (criterionId.startsWith('temp-')) {
        return;
      }
      
      // Anders update in database
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/criteria/${criterionId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ title: newTitle }) 
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Titel wijzigen mislukt');
    } catch (e: any) {
      alert(e?.message || 'Titel wijzigen mislukt');
    }
  };

  const switchToCriterion = (criterionId: string) => {
    // Sla huidige content op in state (niet in database)
    if (selectedCriterionId && editor) {
      const currentHtml = editor.getHTML();
      setCriteria(prev => prev.map(c => 
        c.id === selectedCriterionId ? { ...c, content: currentHtml } : c
      ));
    }
    
    // Switch naar nieuw criterium
    setSelectedCriterionId(criterionId);
    const criterion = criteria.find(c => c.id === criterionId);
    if (criterion && editor) {
      editor.commands.setContent(decorateCitationsInHtml(criterion.content || '<p></p>'));
    }
  };

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
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/ai/generate`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          includeAppaltiBron: useAppaltiBron,
          criterionId: selectedCriterionId || undefined
        }) 
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Genereren mislukt');
      const next = (editor?.getHTML() || '') + `\n<p>\n</p>` + (json.data.generatedText || '').split('\n').map((l: string) => `<p>${decorateCitationsInHtml(l)}</p>`).join('');
      editor?.commands.setContent(next);
      setHasUnsavedChanges(true);
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

  // Inline citation hover/click inside editor content
  useEffect(() => {
    function findSourceByLabel(label: string) {
      return sources.find(s => s.label === label);
    }
    async function fetchPreviewFor(source: any) {
      try {
        const docId = (typeof source?.documentId === 'string') ? source.documentId : source?.documentId?.$oid;
        const firstChunk = source?.chunks && source.chunks.length ? source.chunks[0].index : undefined;
        if (!docId || typeof firstChunk !== 'number') return { text: source?.snippet || '' };
        const params = new URLSearchParams({ docId, chunkIndex: String(firstChunk), window: '1' });
        const r = await fetch(`/api/knowledge/chunk/preview?${params.toString()}`);
        const j = await r.json();
        if (r.ok && j.success) {
          const prev = j.data?.prev?.text || '';
          const focus = j.data?.focus?.text || '';
          const next = j.data?.next?.text || '';
          return { text: [prev && `… ${prev}`, focus, next && `${next} …`].filter(Boolean).join('\n\n') };
        }
      } catch {}
      return { text: source?.snippet || '' };
    }
    const onMouseOver = async (ev: MouseEvent) => {
      const t = ev.target as HTMLElement;
      const el = t && t.closest ? (t.closest('.citation') as HTMLElement | null) : null;
      if (!el) return;
      const label = el.dataset.label || '';
      const src = findSourceByLabel(label);
      if (!src) return;
      const preview = await fetchPreviewFor(src);
      setHoverText(preview.text || '');
      setHoverPos({ x: ev.clientX + 12, y: ev.clientY + 12 });
    };
    const onMouseOut = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement;
      if (t && t.classList && t.classList.contains('citation')) {
        setHoverText('');
        setHoverPos(null);
      }
    };
    const onClick = async (ev: MouseEvent) => {
      const t = ev.target as HTMLElement;
      const el = t && t.closest ? (t.closest('.citation') as HTMLElement | null) : null;
      if (!el) return;
      const label = el.dataset.label || '';
      const src = findSourceByLabel(label);
      if (!src) return;
      try {
        const docId = (typeof src?.documentId === 'string') ? src.documentId : src?.documentId?.$oid;
        const firstChunk = src?.chunks && src.chunks.length ? src.chunks[0].index : undefined;
        if (docId && typeof firstChunk === 'number') {
          const params = new URLSearchParams({ docId, chunkIndex: String(firstChunk), window: '1' });
          const r = await fetch(`/api/knowledge/chunk/preview?${params.toString()}`);
          const j = await r.json();
          if (r.ok && j.success) {
            setInspector({ open: true, title: src.title || src.url, content: { prev: j.data?.prev?.text || null, focus: j.data?.focus?.text || null, next: j.data?.next?.text || null } });
            return;
          }
        }
        setInspector({ open: true, title: src.title || src.url, content: { prev: null, focus: src.snippet || null, next: null } });
      } catch {
        setInspector({ open: true, title: src.title || src.url, content: { prev: null, focus: src.snippet || null, next: null } });
      }
    };
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('click', onClick);
    };
  }, [sources]);

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

  const handleLeidraadUpload = async (file: File) => {
    try {
      setUploadingLeidraad(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      
      // Upload het document
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Upload mislukt');
      
      const documentUrl = json.url;
      const documentInfo = { name: file.name, url: documentUrl, uploadedAt: new Date() };
      setLeidraadDocument(documentInfo);
      
      // We'll save this when extracting criteria (no need for separate API call)
      alert('Leidraad document geüpload! Klik nu op "Analyseer & Extraheer" om criteria en vragen te halen.');
    } catch (e: any) {
      alert(e?.message || 'Upload mislukt');
    } finally {
      setUploadingLeidraad(false);
    }
  };

  const extractCriteriaFromLeidraad = async () => {
    if (!leidraadDocument) {
      alert('Upload eerst een leidraad document');
      return;
    }
    
    try {
      setExtractingCriteria(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/extract-criteria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentUrl: leidraadDocument.url })
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Extractie mislukt');
      
      setExtractedCriteria(json.data.criteria);
      alert(json.data.message || 'Criteria geëxtraheerd!');
    } catch (e: any) {
      alert(e?.message || 'Extractie mislukt');
    } finally {
      setExtractingCriteria(false);
    }
  };

  const extractKeyDataFromDocument = async (documentUrl?: string) => {
    const docUrl = documentUrl || leidraadDocument?.url;
    if (!docUrl) {
      alert('Selecteer een document om te analyseren');
      return;
    }
    
    try {
      setExtractingKeyData(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/extract-keydata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentUrl: docUrl })
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Extractie mislukt');
      
      setExtractedKeyData(json.data.keyData);
      alert(json.data.message || 'Belangrijke data geëxtraheerd!');
    } catch (e: any) {
      alert(e?.message || 'Extractie mislukt');
    } finally {
      setExtractingKeyData(false);
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
            {/* Criterion Management Panel */}
            <div className="card" style={{ padding: '0.75rem', marginBottom: '0.75rem', background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Gunningscriteria ({criteria.length})</h3>
                <button className="btn btn-secondary" onClick={addNewCriterion} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                  + Nieuw criterium
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                Elk criterium is een apart tabblad met eigen content. Klik op een tab om te bewerken.
              </p>
            </div>

            {/* Tabs for Criteria */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', overflowX: 'auto', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.25rem' }}>
              {criteria.map((criterion, idx) => (
                <div
                  key={criterion.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: selectedCriterionId === criterion.id ? '#8b5cf6' : '#fff',
                    color: selectedCriterionId === criterion.id ? '#fff' : '#374151',
                    border: '1px solid ' + (selectedCriterionId === criterion.id ? '#8b5cf6' : '#e5e7eb'),
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: selectedCriterionId === criterion.id ? 600 : 400,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => switchToCriterion(criterion.id)}
                >
                  {editingTitleId === criterion.id ? (
                    <input
                      type="text"
                      value={criterion.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setCriteria(prev => prev.map(c => c.id === criterion.id ? { ...c, title: newTitle } : c));
                      }}
                      onBlur={() => {
                        updateCriterionTitle(criterion.id, criterion.title);
                        setEditingTitleId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateCriterionTitle(criterion.id, criterion.title);
                          setEditingTitleId(null);
                        }
                        if (e.key === 'Escape') {
                          setEditingTitleId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        outline: 'none',
                        width: '120px'
                      }}
                    />
                  ) : (
                    <span>{criterion.title}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTitleId(criterion.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'inherit',
                      opacity: 0.7
                    }}
                    title="Titel bewerken"
                  >
                    ✎
                  </button>
                  {criteria.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCriterion(criterion.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'inherit',
                        opacity: 0.7
                      }}
                      title="Verwijderen"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
              <button className="btn btn-secondary" onClick={generateWithRag} disabled={genLoading}>{genLoading ? 'Genereren...' : 'Genereer met AI (RAG)'}</button>
            </div>

            {/* AI Context Field - Simplified */}
            {selectedCriterionId && (() => {
              const selectedCriterion = criteria.find(c => c.id === selectedCriterionId);
              return selectedCriterion ? (
                <div className="card" style={{ padding: '0.75rem', marginBottom: '0.75rem', background: '#fef3c7', border: '2px solid #f59e0b' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#92400e' }}>
                    🤖 Instructies voor GROK
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 0.5rem 0' }}>
                    Vul hier simpelweg de onderwerpen en deelvragen in voor dit criterium. GROK gebruikt deze bij het genereren.
                  </p>
                  <textarea
                    value={selectedCriterion.aiContext || ''}
                    onChange={(e) => {
                      const newContext = e.target.value;
                      setCriteria(prev => prev.map(c => 
                        c.id === selectedCriterionId ? { ...c, aiContext: newContext } : c
                      ));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder={"Onderwerp: Duurzaamheid\n\nDeelvragen:\n- Wat zijn de concrete duurzaamheidsmaatregelen?\n- Hoe worden resultaten gemeten?\n- Welke certificeringen hebben we?"}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '0.5rem',
                      border: '1px solid #d97706',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '0.5rem' }}>
                    💡 Tip: Of gebruik de automatisch geëxtraheerde criteria uit het leidraad document!
                  </div>
                </div>
              ) : null;
            })()}

            {/* Rich editor */}
            <div className="card" style={{ padding: '0.5rem' }}>
              <Toolbar editor={editor} />
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 500, padding: 12, background: '#fff' }}>
                {editor && <EditorContent editor={editor} />}
              </div>
            </div>
            {/* Export & opties */}
            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:'0.5rem', flexWrap:'wrap' }}>
              <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <input type="checkbox" checked={useAppaltiBron} onChange={e=>setUseAppaltiBron(e.target.checked)} />
                Gebruik appalti_bron (extra context)
              </label>
              <ExportButtons clientId={String(clientId)} tenderId={String(tenderId)} stage={stage} />
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
            {(tenderLink || (sourceLinks && sourceLinks.length) || (sources && sources.length)) && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Referenties</h3>
                <ul>
                  {tenderLink && <li><a href={tenderLink} target="_blank" rel="noreferrer">Aankondiging op TenderNed</a></li>}
                  {sources.map((s,i)=> (
                    <li
                      key={i}
                      style={{ display:'flex', alignItems:'center', gap:8, position:'relative' }}
                      onMouseEnter={async (e)=>{
                        setHoverIdx(i);
                        setHoverPos({ x: (e.currentTarget.getBoundingClientRect().right + window.scrollX + 12), y: (e.currentTarget.getBoundingClientRect().top + window.scrollY) });
                        try {
                          // Only preview if we can resolve a document + chunk
                          const docId = (typeof s.documentId === 'string') ? s.documentId : (s as any).documentId?.$oid || undefined;
                          const firstChunk = s.chunks && s.chunks.length ? s.chunks[0].index : undefined;
                          if (docId && typeof firstChunk === 'number') {
                            const params = new URLSearchParams({ docId, chunkIndex: String(firstChunk), window: '1' });
                            const r = await fetch(`/api/knowledge/chunk/preview?${params.toString()}`);
                            const j = await r.json();
                            if (r.ok && j.success) {
                              const focus = j.data?.focus?.text || '';
                              const prev = j.data?.prev?.text || '';
                              const next = j.data?.next?.text || '';
                              setHoverText([prev && `… ${prev}`, focus, next && `${next} …`].filter(Boolean).join('\n\n'));
                            } else {
                              setHoverText(s.snippet || '');
                            }
                          } else {
                            setHoverText(s.snippet || '');
                          }
                        } catch {
                          setHoverText(s.snippet || '');
                        }
                      }}
                      onMouseLeave={()=>{ setHoverIdx(null); setHoverText(''); setHoverPos(null); }}
                      onClick={async ()=>{
                        try {
                          const docId = (typeof s.documentId === 'string') ? s.documentId : (s as any).documentId?.$oid || undefined;
                          const firstChunk = s.chunks && s.chunks.length ? s.chunks[0].index : undefined;
                          if (docId && typeof firstChunk === 'number') {
                            const params = new URLSearchParams({ docId, chunkIndex: String(firstChunk), window: '1' });
                            const r = await fetch(`/api/knowledge/chunk/preview?${params.toString()}`);
                            const j = await r.json();
                            if (r.ok && j.success) {
                              setInspector({ open: true, title: s.title || s.url, content: { prev: j.data?.prev?.text || null, focus: j.data?.focus?.text || null, next: j.data?.next?.text || null } });
                              return;
                            }
                          }
                          setInspector({ open: true, title: s.title || s.url, content: { prev: null, focus: s.snippet || null, next: null } });
                        } catch {
                          setInspector({ open: true, title: s.title || s.url, content: { prev: null, focus: s.snippet || null, next: null } });
                        }
                      }}
                    >
                      <span title={s.type} aria-label={s.type} style={{ width:18, height:18, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                        {s.type==='client'?'🌳':s.type==='tender'?'🍃':s.type==='attachment'?'📎':'🏠'}
                      </span>
                      <a href={s.url||'#'} target="_blank" rel="noreferrer">[{s.label}] {s.title || s.url}</a>
                      {(hoverIdx===i && hoverPos && hoverText) && (
                        <div style={{ position:'absolute', top:0, left:'calc(100% + 8px)', zIndex:50, maxWidth: 420, background:'#111827', color:'#f9fafb', borderRadius:8, padding:'8px 10px', boxShadow:'0 8px 20px rgba(0,0,0,0.25)' }}>
                          <div style={{ fontSize:'0.85em', whiteSpace:'pre-wrap', lineHeight:1.4 }}>{hoverText}</div>
                        </div>
                      )}
                    </li>
                  ))}
                  {sourceLinks.filter(u=>!sources.some(s=>s.url===u)).map((u, i) => (
                    <li key={`extra-${i}`}><a href={u} target="_blank" rel="noreferrer">{u}</a></li>
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
          {/* Bron-inspector (rechts onder) */}
          {inspector.open && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h3>Bron-inspector</h3>
                <button className="btn btn-secondary" onClick={()=>setInspector({ open:false, content:null })}>Sluiten</button>
              </div>
              <div style={{ color:'#6b7280', marginBottom:8 }}>{inspector.title}</div>
              {inspector.content && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
                  {inspector.content.prev && <div style={{ fontSize:'0.9em', whiteSpace:'pre-wrap', background:'#f9fafb', padding:8, borderRadius:6 }}>… {inspector.content.prev}</div>}
                  {inspector.content.focus && <div style={{ whiteSpace:'pre-wrap', background:'#f3e8ff', padding:10, borderRadius:6 }}>{inspector.content.focus}</div>}
                  {inspector.content.next && <div style={{ fontSize:'0.9em', whiteSpace:'pre-wrap', background:'#f9fafb', padding:8, borderRadius:6 }}>{inspector.content.next} …</div>}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Leidraad Document Upload (VERPLICHT) */}
            <div className="card" style={{ padding: '0.75rem', background: leidraadDocument ? '#d1fae5' : '#fee2e2', border: '2px solid ' + (leidraadDocument ? '#10b981' : '#ef4444') }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: leidraadDocument ? '#065f46' : '#991b1b' }}>📋 Leidraad Document {leidraadDocument ? '✓' : '(VERPLICHT)'}</h3>
              {!leidraadDocument ? (
                <>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: '#7f1d1d' }}>
                    Upload het aanbestedingsleidraad document. Dit is <strong>verplicht</strong> om te beginnen.
                  </p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => leidraadInputRef.current?.click()} 
                    disabled={uploadingLeidraad}
                    style={{ width: '100%' }}
                  >
                    {uploadingLeidraad ? 'Uploaden...' : 'Upload Leidraad Document'}
                  </button>
                  <input 
                    ref={leidraadInputRef} 
                    type="file" 
                    accept=".pdf,.doc,.docx" 
                    style={{ display: 'none' }} 
                    onChange={(e) => { 
                      const f = e.target.files?.[0]; 
                      if (f) handleLeidraadUpload(f); 
                      e.currentTarget.value=''; 
                    }} 
                  />
                </>
              ) : (
                <>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <strong>{leidraadDocument.name}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={extractCriteriaFromLeidraad} 
                      disabled={extractingCriteria}
                      style={{ width: '100%' }}
                    >
                      {extractingCriteria ? 'Analyseren...' : '🤖 Analyseer & Extraheer Criteria'}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => extractKeyDataFromDocument()} 
                      disabled={extractingKeyData}
                      style={{ width: '100%' }}
                    >
                      {extractingKeyData ? 'Analyseren...' : '📊 Extraheer Belangrijke Data'}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => { setLeidraadDocument(null); setExtractedCriteria([]); setExtractedKeyData([]); }}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      ❌ Verwijder & Upload nieuw
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Zoek bronnen */}
            <div className="card" style={{ padding: '0.75rem' }}>
              <h3>Zoek bronnen</h3>
              <input placeholder="Zoek in documenten" onKeyDown={e => { if (e.key==='Enter') doSearch((e.target as HTMLInputElement).value); }} style={{ width: '100%', marginBottom: 8 }} />
              <button className="btn btn-secondary" onClick={() => doSearch(prompt('Zoekterm') || '')} disabled={searching}>{searching?'Zoeken...':'Zoek'}</button>
              <ul style={{ marginTop: 8 }}>
                {results.map((r:any,i:number)=> (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: '0.9em' }}>{r.text?.slice(0,180)}...</div>
                    {r.document?.title && (
                      <div style={{ color: '#6b7280', display:'flex', alignItems:'center', gap:6 }}>
                        <span>{r.document?.companyId ? '🌳' : (r.document?.scope==='horizontal' ? '🏠' : '🍃')}</span>
                        <span>{r.document.title}</span>
                      </div>
                    )}
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
              <h3>Beoordeling door {clientName || 'client'}</h3>
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

            {/* Gunningscriteria & Deelvragen */}
            {extractedCriteria.length > 0 && (
              <details className="card" style={{ padding: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem', color: '#7c3aed' }}>
                  🎯 Gunningscriteria & Deelvragen ({extractedCriteria.length})
                </summary>
                <div style={{ marginTop: '0.75rem' }}>
                  {extractedCriteria.map((criterion, idx) => (
                    <div key={idx} style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                        {criterion.title}
                        {criterion.weight !== undefined && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>({criterion.weight}%)</span>}
                      </div>
                      {criterion.subQuestions && criterion.subQuestions.length > 0 && (
                        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Deelvragen:</div>
                          <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                            {criterion.subQuestions.map((q, qIdx) => (
                              <li key={qIdx} style={{ marginBottom: '0.25rem' }}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Belangrijke Data */}
            {extractedKeyData.length > 0 && (
              <details className="card" style={{ padding: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem', color: '#0891b2' }}>
                  📊 Belangrijke Data ({extractedKeyData.reduce((sum, cat) => sum + cat.items.length, 0)} items)
                </summary>
                <div style={{ marginTop: '0.75rem' }}>
                  {extractedKeyData.map((category, idx) => (
                    <div key={idx} style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#0e7490', fontSize: '0.95rem' }}>
                        {category.category}
                      </div>
                      <div style={{ paddingLeft: '0.5rem' }}>
                        {category.items.map((item, iIdx) => (
                          <div key={iIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                            <div style={{ color: '#6b7280', fontWeight: 500 }}>{item.label}:</div>
                            <div style={{ color: '#374151' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
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
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleTaskList?.().run?.()}>☑ Taken</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleCodeBlock?.().run?.()}>{"<> Code"}</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().insertTable?.({ rows: 3, cols: 3, withHeaderRow: true }).run?.()}>Tabel</button>
      <button className="btn btn-secondary" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Clear</button>
    </div>
  );
}

function ExportButtons({ clientId, tenderId, stage }: { clientId: string; tenderId: string; stage: string }) {
  const download = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
  };
  // Resolve bidId via API (same helper as above would require lifting; keep simple fetch)
  const getBidId = async (): Promise<string|undefined> => {
    try {
      const res = await fetch(`/api/clients/${clientId}/tenders`);
      const json = await res.json();
      if (!res.ok || !json.success) return undefined;
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      return item?.bid?.id;
    } catch { return undefined; }
  };
  return (
    <div style={{ display:'inline-flex', gap:6 }}>
      <button className="btn btn-secondary" onClick={async()=>{ const id = await getBidId(); if (id) download(`/api/bids/${id}/stages/${stage}/export/docx`); }}>Export DOCX</button>
      <button className="btn btn-secondary" onClick={async()=>{ const id = await getBidId(); if (id) download(`/api/bids/${id}/stages/${stage}/export/pdf`); }}>Export PDF</button>
    </div>
  );
}

