'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Link from 'next/link';
import { InlineLoadingSpinner } from '@/components/ui/LoadingSpinner';
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
  const selectedCriterionIdRef = useRef<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Leidraad document & extracted data
  const [leidraadDocument, setLeidraadDocument] = useState<{ name: string; url: string; uploadedAt?: Date } | null>(null);
  const [uploadingLeidraad, setUploadingLeidraad] = useState(false);
  const [extractingCriteria, setExtractingCriteria] = useState(false);
  const [extractingKeyData, setExtractingKeyData] = useState(false);
  const [extractedCriteria, setExtractedCriteria] = useState<Array<{ 
    title: string; 
    isPerceel?: boolean;
    weight?: number; 
    sourceReference?: string;
    subCriteria: Array<{
      title: string;
      weight?: number;
      points?: number;
      sourceReference?: string;
      maxA4?: number; // Maximum aantal A4 pagina's voor deze deelvraag
      assessmentPoints: string[];
    }>
  }>>([]);
  const [extractedKeyData, setExtractedKeyData] = useState<Array<{ category: string; items: Array<{ label: string; value: string }> }>>([]);
  const leidraadInputRef = useRef<HTMLInputElement>(null);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<number>>(new Set());
  const [expandedSubCriteria, setExpandedSubCriteria] = useState<Set<string>>(new Set());
  const [editingExtractedCriteria, setEditingExtractedCriteria] = useState(false);
  const [keyDataExpanded, setKeyDataExpanded] = useState(false);
  const [referencesExpanded, setReferencesExpanded] = useState(false);

  // Source viewer modal state
  const [sourceViewerOpen, setSourceViewerOpen] = useState(false);
  const [sourceViewerLoading, setSourceViewerLoading] = useState(false);
  const [sourceViewerData, setSourceViewerData] = useState<{
    document: { id: string; title: string; totalChunks: number };
    chunks: Array<{ index: number; text: string; pageNumber?: number }>;
    highlightChunks: number[];
  } | null>(null);

  // Hover preview tooltip state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverText, setHoverText] = useState<string>('');
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Right-side inspector state
  const [inspector, setInspector] = useState<{ open: boolean; title?: string; content?: { prev?: string|null; focus?: string|null; next?: string|null } | null }>({ open: false, content: null });

  // A4 page tracking - approximately 3000 characters per A4 page (with standard margins and font)
  const [textStats, setTextStats] = useState({ characters: 0, words: 0, pages: 0 });
  const CHARS_PER_A4 = 3000; // Conservative estimate for formatted text

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
    onUpdate: ({ editor }) => {
      setHasUnsavedChanges(true);
      // Calculate text stats for A4 indicator
      const text = editor.getText();
      const chars = text.length;
      const words = text.split(/\s+/).filter(Boolean).length;
      const pages = chars / CHARS_PER_A4;
      setTextStats({ characters: chars, words, pages });
      
      // Update criteria state in real-time so export has latest content
      // Use ref to get current selectedCriterionId (closure issue with useState)
      const currentCriterionId = selectedCriterionIdRef.current;
      if (currentCriterionId) {
        const html = editor.getHTML();
        setCriteria(prev => prev.map(c => 
          c.id === currentCriterionId ? { ...c, content: html } : c
        ));
      }
    }
  });

  // Keep ref in sync with state for use in onUpdate callback
  useEffect(() => {
    selectedCriterionIdRef.current = selectedCriterionId;
  }, [selectedCriterionId]);

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
        // Update bestaand criterium - stuur ALLE velden mee
        const res = await fetch(`/api/bids/${bidId}/stages/${stage}/criteria/${selectedCriterionId}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            title: selectedCriterion.title,
            content: html, 
            aiContext: selectedCriterion.aiContext 
          }) 
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
      
      // EERST opslaan zodat de laatste aiContext in de database staat
      if (selectedCriterionId) {
        const selectedCriterion = criteria.find(c => c.id === selectedCriterionId);
        if (selectedCriterion && !selectedCriterion.id.startsWith('temp-')) {
          // Sla aiContext op voordat we genereren
          await fetch(`/api/bids/${bidId}/stages/${stage}/criteria/${selectedCriterionId}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
              aiContext: selectedCriterion.aiContext || '',
              content: editor?.getHTML() || selectedCriterion.content
            }) 
          });
        }
      }
      
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

  // DMU (Decision Making Unit) role for AI review
  const [dmuRole, setDmuRole] = useState<string>('Inkoopadviseur');
  const dmuOptions = [
    'Inkoopadviseur',
    'Contractmanager', 
    'Technisch specialist',
    'Financieel adviseur',
    'Projectmanager',
    'Afdelingshoofd',
    'Directeur',
    'Kwaliteitsmanager'
  ];

  const runAiReview = async () => {
    try {
      setRevLoading(true);
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');
      const html = editor?.getHTML() || '';
      const res = await fetch(`/api/bids/${bidId}/stages/${stage}/review/paragraphs`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          content: html, 
          max: 10,
          dmuRole: dmuRole,
          tenderTitle: clientName ? `aanbesteding voor ${clientName}` : 'deze aanbesteding'
        }) 
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'AI review mislukt');
      setSuggestions(json.data.suggestions || []);
    } catch (e: any) { alert(e?.message || 'AI review mislukt'); }
    finally { setRevLoading(false); }
  };

  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Open source viewer modal with highlighted chunks
  const openSourceViewer = async (documentId: string, chunkIndices: number[] = []) => {
    try {
      setSourceViewerLoading(true);
      setSourceViewerOpen(true);
      setSourceViewerData(null);

      const res = await fetch(`/api/knowledge/documents/${documentId}/chunks`);
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Fout bij ophalen document');
      }

      setSourceViewerData({
        document: json.data.document,
        chunks: json.data.chunks,
        highlightChunks: chunkIndices
      });
    } catch (e: any) {
      alert(e?.message || 'Fout bij ophalen document');
      setSourceViewerOpen(false);
    } finally {
      setSourceViewerLoading(false);
    }
  };

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
      
      // Sla het leidraad document op in de database
      const saveRes = await fetch(`/api/bids/${bidId}/stages/${stage}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leidraadDocument: documentInfo })
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson.success) {
        console.error('Failed to save leidraad document reference:', saveJson.error);
      }
      
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

  const createTabsFromSubCriteria = async () => {
    if (extractedCriteria.length === 0) {
      alert('Geen criteria gevonden. Extraheer eerst de criteria.');
      return;
    }

    try {
      const bidId = await bidIdFromQuery();
      if (!bidId) throw new Error('Bid niet gevonden');

      // Verzamel alle sub-criteria
      const newCriteria: Array<{ title: string; content: string; aiContext: string; order: number }> = [];
      let order = 0;

      for (const mainCrit of extractedCriteria) {
        if (mainCrit.subCriteria && mainCrit.subCriteria.length > 0) {
          for (const subCrit of mainCrit.subCriteria) {
            // Maak AI context van de assessment points, inclusief A4 limiet
            let aiContext = `${mainCrit.title}\n\n${subCrit.title}`;
            
            // Voeg A4 limiet toe als deze is ingesteld
            if (subCrit.maxA4) {
              aiContext += `\n\n⚠️ MAXIMALE OMVANG: ${subCrit.maxA4} A4 (±${Math.round(subCrit.maxA4 * 500)} woorden)`;
            }
            
            aiContext += `\n\nDeelvragen/Beoordelingspunten:\n${(subCrit.assessmentPoints || []).map(p => `- ${p}`).join('\n')}`;
            
            newCriteria.push({
              title: subCrit.title,
              content: '<p></p>',
              aiContext: aiContext,
              order: order++
            });
          }
        }
      }

      if (newCriteria.length === 0) {
        alert('Geen sub-criteria gevonden om tabbladen van te maken.');
        return;
      }

      // Maak alle criteria aan via API
      setSaving(true);
      const createdCriteria = [];
      for (const crit of newCriteria) {
        const res = await fetch(`/api/bids/${bidId}/stages/${stage}/criteria`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(crit)
        });
        const json = await res.json();
        if (res.ok && json.success) {
          createdCriteria.push(json.data.criterion);
        }
      }

      // Update lokale state
      setCriteria(createdCriteria);
      if (createdCriteria.length > 0) {
        setSelectedCriterionId(createdCriteria[0].id);
        if (editor) {
          editor.commands.setContent(createdCriteria[0].content || '<p></p>');
        }
      }

      alert(`${createdCriteria.length} tabbladen aangemaakt uit sub-criteria!`);
    } catch (e: any) {
      alert(e?.message || 'Kon tabbladen niet aanmaken');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <InlineLoadingSpinner />
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

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
              <button className="btn btn-secondary" onClick={generateWithRag} disabled={genLoading}>{genLoading ? 'Genereren...' : 'Genereer met AI (RAG)'}</button>
              {selectedCriterionId && (() => {
                const selectedCriterion = criteria.find(c => c.id === selectedCriterionId);
                const hasContext = selectedCriterion?.aiContext && selectedCriterion.aiContext.trim().length > 20;
                return hasContext ? (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    padding: '0.4rem 0.7rem', 
                    background: '#10b981', 
                    color: 'white', 
                    borderRadius: '6px',
                    fontWeight: 500
                  }}>
                    Beantwoordingsmodus actief
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    padding: '0.4rem 0.7rem', 
                    background: '#f59e0b', 
                    color: 'white', 
                    borderRadius: '6px',
                    fontWeight: 500
                  }}>
                    Vul eerst AI Instructies in
                  </div>
                );
              })()}
            </div>

            {/* AI Context Field - Minimalistisch */}
            {selectedCriterionId && (() => {
              const selectedCriterion = criteria.find(c => c.id === selectedCriterionId);
              return selectedCriterion ? (
                <div className="card" style={{ padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#701c74' }}>
                      Deelvragen
                    </h3>
                  </div>
                  <div>
                    <textarea
                      value={selectedCriterion.aiContext || ''}
                      onChange={(e) => {
                        const newContext = e.target.value;
                        setCriteria(prev => prev.map(c => 
                          c.id === selectedCriterionId ? { ...c, aiContext: newContext } : c
                        ));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder={"Wensvraag: Kwaliteit van de tekeningen\n\nDeelvraag 1.1: Beschrijving van het proces van het vervaardigen en bewerken van de tekeningen\n- Hoe beschrijft u het proces?\n- Welke stappen doorloopt u?\n- Welke kwaliteitscontroles voert u uit?\n\nDeelvraag 1.2: Uitleg over de communicatie en samenwerking met de opdrachtgever\n- Hoe communiceert u tijdens het proces?\n- Welke tools gebruikt u?\n- Hoe vaak zijn er contactmomenten?"}
                      style={{
                        width: '100%',
                        minHeight: '140px',
                        padding: '0.5rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                        lineHeight: '1.5'
                      }}
                    />
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#6b7280', 
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: '#fef3c7',
                      borderRadius: '4px',
                      borderLeft: '3px solid #f59e0b'
                    }}>
                      <strong>Let op:</strong> De AI genereert geen algemene tekst, maar beantwoordt elke deelvraag met concrete voorbeelden van HOE uw bedrijf dit aanpakt. Gebruik de geëxtraheerde criteria uit het leidraad!
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Rich editor with A4 indicator */}
            <div className="card" style={{ padding: '0.5rem' }}>
              {/* A4 Page Indicator */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
                background: textStats.pages > 2 ? '#fef2f2' : textStats.pages > 1 ? '#fefce8' : '#f0fdf4',
                borderRadius: '6px',
                border: `1px solid ${textStats.pages > 2 ? '#fecaca' : textStats.pages > 1 ? '#fde047' : '#86efac'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: textStats.pages > 2 ? '#dc2626' : textStats.pages > 1 ? '#ca8a04' : '#16a34a'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>📄</span>
                    <span>{textStats.pages.toFixed(1)} A4</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {textStats.words} woorden • {textStats.characters} tekens
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.25rem',
                  alignItems: 'center'
                }}>
                  {/* Visual page indicators */}
                  {Array.from({ length: Math.min(Math.ceil(textStats.pages), 5) }).map((_, i) => (
                    <div 
                      key={i}
                      style={{
                        width: '12px',
                        height: '16px',
                        borderRadius: '2px',
                        background: i < Math.floor(textStats.pages) 
                          ? (textStats.pages > 2 ? '#dc2626' : textStats.pages > 1 ? '#eab308' : '#22c55e')
                          : '#e5e7eb',
                        border: '1px solid rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
                  {textStats.pages > 5 && (
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>+{Math.ceil(textStats.pages) - 5}</span>
                  )}
                </div>
              </div>
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
              <ExportButtons clientId={String(clientId)} tenderId={String(tenderId)} stage={stage} criteria={criteria} sources={sources} />
            </div>
            {/* Bronnen & Referenties - Gedetailleerd Dropdown */}
            {(tenderLink || (sourceLinks && sourceLinks.length) || (sources && sources.length)) && (
              <div className="card" style={{ padding: '0', overflow: 'hidden', marginTop: '1rem' }}>
                <div 
                  onClick={() => setReferencesExpanded(!referencesExpanded)}
                  style={{ 
                    padding: '0.75rem', 
                    background: '#701c74', 
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                      Referenties & Bronnen
                    </h3>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.9 }}>
                      {sources.length + (tenderLink ? 1 : 0)} bronnen gebruikt
                    </div>
                  </div>
                  <div style={{ fontSize: '1.2rem' }}>
                    {referencesExpanded ? '▼' : '▶'}
                  </div>
                </div>
                {referencesExpanded && (
                  <div style={{ padding: '0.75rem' }}>
                    {tenderLink && (
                      <div style={{ 
                        padding: '0.75rem', 
                        background: '#f0fdf4', 
                        border: '1px solid #86efac',
                        borderRadius: '6px',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ fontSize: '1.2rem' }}>🍃</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#166534', marginBottom: '0.25rem' }}>
                              TenderNed Aankondiging
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                              <strong>Locatie:</strong> Extern (TenderNed platform)
                            </div>
                            <a 
                              href={tenderLink} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ fontSize: '0.85rem', color: '#701c74', textDecoration: 'underline' }}
                            >
                              {tenderLink}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {sources.map((s, i) => {
                      const getSourceInfo = () => {
                        switch (s.type) {
                          case 'client':
                            return {
                              icon: '🌳',
                              label: 'Bedrijfsdocument',
                              location: 'In platform (Knowledge Base)',
                              detail: s.title || 'Document',
                              bg: '#f0f9ff',
                              borderColor: '#93c5fd',
                              textColor: '#1e40af'
                            };
                          case 'attachment':
                            return {
                              icon: '📎',
                              label: 'Geüploade bijlage',
                              location: 'In platform (Bid attachments)',
                              detail: s.title || 'Bijlage',
                              bg: '#fef3c7',
                              borderColor: '#fcd34d',
                              textColor: '#92400e'
                            };
                          case 'tender':
                            return {
                              icon: '🍃',
                              label: 'TenderNed document',
                              location: 'Extern (TenderNed)',
                              detail: s.title || 'Tender document',
                              bg: '#f0fdf4',
                              borderColor: '#86efac',
                              textColor: '#166534'
                            };
                          case 'xai':
                            return {
                              icon: '🏠',
                              label: 'Appalti Best Practice',
                              location: s.url?.includes('/api/knowledge/') ? 'In platform (appalti_bron)' : 'Extern (X.AI Collection)',
                              detail: s.title || 'Referentie document',
                              bg: '#faf5ff',
                              borderColor: '#d8b4fe',
                              textColor: '#6b21a8'
                            };
                          default:
                            return {
                              icon: '❓',
                              label: 'Onbekend',
                              location: 'Locatie onbekend - geen metadata beschikbaar',
                              detail: s.title || s.url || 'Geen informatie beschikbaar',
                              bg: '#f9fafb',
                              borderColor: '#d1d5db',
                              textColor: '#6b7280'
                            };
                        }
                      };
                      
                      const info = getSourceInfo();
                      
                      return (
                        <div 
                          key={i}
                          style={{ 
                            padding: '0.75rem', 
                            background: info.bg, 
                            border: `1px solid ${info.borderColor}`,
                            borderRadius: '6px',
                            marginBottom: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <div style={{ fontSize: '1.2rem' }}>{info.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: info.textColor, marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                [{s.label}] {info.label}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                <strong>Locatie:</strong> {info.location}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.25rem' }}>
                                <strong>Document:</strong> {info.detail}
                              </div>
                              {s.chunks && s.chunks.length > 0 && (
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                  📄 Gebruikt: {s.chunks.length} {s.chunks.length === 1 ? 'fragment' : 'fragmenten'}
                                  {s.chunks[0].pageNumber && ` (o.a. pagina ${s.chunks[0].pageNumber})`}
                                </div>
                              )}
                              {s.snippet && (
                                <div style={{ 
                                  fontSize: '0.8rem', 
                                  color: '#6b7280', 
                                  marginTop: '0.5rem',
                                  padding: '0.5rem',
                                  background: 'white',
                                  borderLeft: '3px solid ' + info.borderColor,
                                  borderRadius: '3px',
                                  fontStyle: 'italic'
                                }}>
                                  "{s.snippet.slice(0, 150)}..."
                                </div>
                              )}
                              {s.documentId && (
                                <button 
                                  onClick={() => {
                                    const docId = typeof s.documentId === 'string' ? s.documentId : s.documentId.toString();
                                    const chunkIndices = (s.chunks || []).map(c => c.index);
                                    openSourceViewer(docId, chunkIndices);
                                  }}
                                  style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#701c74', 
                                    textDecoration: 'underline',
                                    display: 'inline-block',
                                    marginTop: '0.5rem',
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer'
                                  }}
                                >
                                  → Bekijk bron met highlights
                                </button>
                              )}
                              {s.url && !s.documentId && (
                                <a 
                                  href={s.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#701c74', 
                                    textDecoration: 'underline',
                                    display: 'inline-block',
                                    marginTop: '0.5rem'
                                  }}
                                >
                                  → Bekijk externe bron
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {sourceLinks.filter(u => !sources.some(s => s.url === u)).map((u, i) => (
                      <div 
                        key={`extra-${i}`}
                        style={{ 
                          padding: '0.75rem', 
                          background: '#f9fafb', 
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ fontSize: '1.2rem' }}>❓</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                              Extra bron
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              <strong>Locatie:</strong> Onbekend - geen metadata beschikbaar
                            </div>
                            <a 
                              href={u} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ 
                                fontSize: '0.8rem', 
                                color: '#701c74', 
                                textDecoration: 'underline',
                                wordBreak: 'break-all'
                              }}
                            >
                              {u}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
            {/* Leidraad Document Upload */}
            <div className="card" style={{ padding: '0.75rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#701c74' }}>
                  Leidraad Document
                </h3>
                {leidraadDocument && (
                  <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#6b7280' }}>
                    {leidraadDocument.name}
                  </div>
                )}
              </div>
              <div>
                {!leidraadDocument ? (
                  <>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#6b7280' }}>
                      Upload het aanbestedingsleidraad document.
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
                  <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={extractCriteriaFromLeidraad} 
                      disabled={extractingCriteria}
                      style={{ width: '100%' }}
                    >
                      {extractingCriteria ? 'Analyseren...' : 'Analyseer & Extraheer Criteria'}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => extractKeyDataFromDocument()} 
                      disabled={extractingKeyData}
                      style={{ width: '100%' }}
                    >
                      {extractingKeyData ? 'Analyseren...' : 'Extraheer Belangrijke Data'}
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={createTabsFromSubCriteria} 
                      disabled={saving || extractedCriteria.length === 0}
                      style={{ width: '100%', background: '#701c74', borderColor: '#701c74' }}
                    >
                      ✓ Maak Tabbladen van Sub-criteria
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => { setLeidraadDocument(null); setExtractedCriteria([]); setExtractedKeyData([]); }}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      Verwijder & Upload nieuw
                    </button>
                  </div>
                )}
              </div>
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
            {/* AI review met DMU perspectief */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem', background: '#701c74', color: 'white' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>AI Review (SMART Check)</h3>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.9 }}>
                  Beoordeling vanuit DMU perspectief
                    </div>
              </div>
              <div style={{ padding: '0.75rem' }}>
                {/* DMU Dropdown */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Beoordelaar (Decision Making Unit)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select 
                      value={dmuRole} 
                      onChange={(e) => setDmuRole(e.target.value)}
                      style={{ 
                        flex: 1, 
                        padding: '0.5rem', 
                        borderRadius: '6px', 
                        border: '1px solid #d8b4fe',
                        fontSize: '0.9rem'
                      }}
                    >
                      {dmuOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Of typ een andere rol..."
                      value={!dmuOptions.includes(dmuRole) ? dmuRole : ''}
                      onChange={(e) => setDmuRole(e.target.value)}
                      style={{ 
                        flex: 1, 
                        padding: '0.5rem', 
                        borderRadius: '6px', 
                        border: '1px solid #e5e7eb',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    De AI beoordeelt vanuit het perspectief van een {dmuRole}
                  </div>
                </div>
                
                <button 
                  className="btn btn-primary" 
                  onClick={runAiReview} 
                  disabled={revLoading}
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  {revLoading ? 'Analyseren...' : `🔍 Review als ${dmuRole}`}
                </button>
                
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {suggestions.map((s: any, i: number) => (
                      <div 
                        key={i} 
                        style={{ 
                          marginBottom: '1rem', 
                          padding: '0.75rem',
                          background: '#faf5ff',
                          borderRadius: '6px',
                          border: '1px solid #e9d5ff'
                        }}
                      >
                        {/* Header met SMART score */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 600, color: '#701c74' }}>
                            Alinea {s.index + 1}
                          </div>
                          {s.smartScore && (
                            <div style={{ 
                              display: 'flex', 
                              gap: '2px',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: '0.25rem' }}>SMART:</span>
                              {[1, 2, 3, 4, 5].map(n => (
                                <div 
                                  key={n}
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '2px',
                                    background: n <= s.smartScore 
                                      ? (s.smartScore >= 4 ? '#22c55e' : s.smartScore >= 3 ? '#eab308' : '#ef4444')
                                      : '#e5e7eb'
                                  }}
                                />
                              ))}
                              <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem', fontWeight: 600 }}>
                                {s.smartScore}/5
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Diagnose */}
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#dc2626', 
                          marginBottom: '0.5rem',
                          padding: '0.5rem',
                          background: '#fef2f2',
                          borderRadius: '4px'
                        }}>
                          <strong>Probleem:</strong> {s.diagnose}
                        </div>
                        
                        {/* SMARTER tips */}
                        {s.smarterTips && (
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: '#0369a1', 
                            marginBottom: '0.5rem',
                            padding: '0.5rem',
                            background: '#f0f9ff',
                            borderRadius: '4px'
                          }}>
                            <strong>💡 SMARTER maken:</strong> {s.smarterTips}
                          </div>
                        )}
                        
                        {/* Improved version */}
                        <div style={{ 
                          fontSize: '0.9rem', 
                          marginBottom: '0.5rem',
                          padding: '0.5rem',
                          background: '#f0fdf4',
                          borderRadius: '4px',
                          borderLeft: '3px solid #22c55e'
                        }}>
                          <strong style={{ color: '#166534' }}>Verbeterde versie:</strong>
                          <div style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{s.improved}</div>
                        </div>
                        
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => applySuggestion(s, 'replace')}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                          >
                            ✓ Vervang
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => applySuggestion(s, 'append')}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                          >
                            + Voeg toe
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {suggestions.length === 0 && !revLoading && (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                    Klik op de knop om de tekst te laten beoordelen door een {dmuRole}
                  </div>
                )}
              </div>
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
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem', background: '#701c74', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                      Gunningscriteria & Beoordelingspunten
                    </h3>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.9 }}>
                      {extractedCriteria.length} {extractedCriteria.length === 1 ? 'criterium' : 'criteria'} · 
                      {' '}{extractedCriteria.reduce((sum, c) => sum + (c.subCriteria?.length || 0), 0)} sub-criteria
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    onClick={async () => {
                      if (editingExtractedCriteria) {
                        // Opslaan
                        try {
                          const bidId = await bidIdFromQuery();
                          if (!bidId) throw new Error('Bid niet gevonden');
                          const res = await fetch(`/api/bids/${bidId}/stages/${stage}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ extractedCriteria })
                          });
                          const json = await res.json();
                          if (!res.ok || !json.success) throw new Error(json.error || 'Opslaan mislukt');
                          alert('Criteria opgeslagen!');
                        } catch (e: any) {
                          alert(e?.message || 'Opslaan mislukt');
                        }
                      }
                      setEditingExtractedCriteria(!editingExtractedCriteria);
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem', background: 'white', color: '#701c74' }}
                  >
                    {editingExtractedCriteria ? '✓ Opslaan' : '✎ Bewerken'}
                  </button>
                </div>
                <div style={{ padding: '0.75rem' }}>
                  {extractedCriteria.map((criterion, idx) => (
                    <div key={idx} style={{ marginBottom: idx < extractedCriteria.length - 1 ? '1rem' : 0 }}>
                      {/* Hoofdcriterium / Perceel */}
                      <div 
                        style={{ 
                          padding: '0.75rem',
                          background: criterion.isPerceel ? '#ddd6fe' : '#f3e8ff',
                          border: '2px solid ' + (criterion.isPerceel ? '#a78bfa' : '#c084fc'),
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => {
                          const newExpanded = new Set(expandedCriteria);
                          if (newExpanded.has(idx)) {
                            newExpanded.delete(idx);
                          } else {
                            newExpanded.add(idx);
                          }
                          setExpandedCriteria(newExpanded);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            {criterion.isPerceel && (
                              <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Perceel
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {editingExtractedCriteria ? (
                                <>
                                  <input
                                    type="text"
                                    value={criterion.title}
                                    onChange={(e) => {
                                      const newCriteria = [...extractedCriteria];
                                      newCriteria[idx].title = e.target.value;
                                      setExtractedCriteria(newCriteria);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ 
                                      fontWeight: 600, 
                                      color: '#6b21a8', 
                                      fontSize: '0.95rem',
                                      flex: 1,
                                      padding: '0.25rem',
                                      border: '1px solid #9333ea',
                                      borderRadius: '4px'
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Dit hoofdcriterium en alle sub-criteria verwijderen?')) {
                                        const newCriteria = [...extractedCriteria];
                                        newCriteria.splice(idx, 1);
                                        setExtractedCriteria(newCriteria);
                                      }
                                    }}
                                    style={{
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.5rem',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      fontWeight: 600
                                    }}
                                    title="Verwijder hoofdcriterium"
                                  >
                                    × Verwijder
                                  </button>
                                </>
                              ) : (
                                <div style={{ fontWeight: 600, color: '#6b21a8', fontSize: '0.95rem' }}>
                                  {criterion.title}
                                </div>
                              )}
                            </div>
                            {criterion.weight !== undefined && (
                              <div style={{ fontSize: '0.85rem', color: '#7c3aed', marginTop: '0.25rem' }}>
                                Weging: {criterion.weight}%
                              </div>
                            )}
                          </div>
                          {criterion.sourceReference && (
                            <div 
                              style={{ 
                                fontSize: '0.75rem', 
                                color: '#9333ea',
                                background: 'white',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                marginLeft: '0.5rem',
                                cursor: 'help'
                              }}
                              title={`Bron: ${criterion.sourceReference}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {criterion.sourceReference}
                            </div>
                          )}
                          <div style={{ marginLeft: '0.5rem', color: '#8b5cf6', fontSize: '1.2rem' }}>
                            {expandedCriteria.has(idx) ? '▼' : '▶'}
                          </div>
                        </div>
                      </div>

                      {/* Sub-criteria (expanded) */}
                      {expandedCriteria.has(idx) && criterion.subCriteria && criterion.subCriteria.length > 0 && (
                        <div style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
                          {criterion.subCriteria.map((subCrit, subIdx) => {
                            const subKey = `${idx}-${subIdx}`;
                            const isExpanded = expandedSubCriteria.has(subKey);
                            
                            return (
                              <div key={subIdx} style={{ marginBottom: '0.5rem' }}>
                                {/* Sub-criterium header */}
                                <div
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    background: 'white',
                                    border: '1px solid #d8b4fe',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onClick={() => {
                                    const newExpanded = new Set(expandedSubCriteria);
                                    if (newExpanded.has(subKey)) {
                                      newExpanded.delete(subKey);
                                    } else {
                                      newExpanded.add(subKey);
                                    }
                                    setExpandedSubCriteria(newExpanded);
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {/* Titel - volledige breedte bij bewerken */}
                                      {editingExtractedCriteria ? (
                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                          <input
                                            type="text"
                                            value={subCrit.title}
                                            onChange={(e) => {
                                              const newCriteria = [...extractedCriteria];
                                              newCriteria[idx].subCriteria[subIdx].title = e.target.value;
                                              setExtractedCriteria(newCriteria);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ 
                                              fontWeight: 500, 
                                              color: '#374151', 
                                              fontSize: '0.9rem',
                                              flex: 1,
                                            padding: '0.5rem',
                                            border: '2px solid #d8b4fe',
                                            borderRadius: '6px',
                                            minWidth: '200px'
                                            }}
                                          />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm('Dit sub-criterium verwijderen?')) {
                                                const newCriteria = [...extractedCriteria];
                                                newCriteria[idx].subCriteria.splice(subIdx, 1);
                                                setExtractedCriteria(newCriteria);
                                              }
                                            }}
                                            style={{
                                              background: '#ef4444',
                                              color: 'white',
                                              border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.5rem 0.75rem',
                                              cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap'
                                            }}
                                            title="Verwijder sub-criterium"
                                          >
                                          × Verwijder
                                          </button>
                                      </div>
                                      ) : (
                                        <div style={{ fontWeight: 500, color: '#374151', fontSize: '0.9rem' }}>
                                          {subCrit.title}
                                        </div>
                                      )}
                                    {/* Weging, Punten, A4 limiet - tweede rij */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {subCrit.weight !== undefined && (
                                          <span>Weging: {subCrit.weight}%</span>
                                        )}
                                        {subCrit.points !== undefined && (
                                          <span>Punten: {subCrit.points}</span>
                                        )}
                                        {/* A4 Limiet */}
                                        {editingExtractedCriteria ? (
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            Max A4:
                                            <input
                                              type="number"
                                              step="0.5"
                                              min="0.5"
                                              max="10"
                                              value={subCrit.maxA4 || ''}
                                              placeholder="?"
                                              onChange={(e) => {
                                                const newCriteria = [...extractedCriteria];
                                                newCriteria[idx].subCriteria[subIdx].maxA4 = e.target.value ? parseFloat(e.target.value) : undefined;
                                                setExtractedCriteria(newCriteria);
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              style={{
                                                width: '50px',
                                                padding: '0.15rem 0.25rem',
                                                border: '1px solid #d8b4fe',
                                                borderRadius: '3px',
                                                fontSize: '0.8rem',
                                                textAlign: 'center'
                                              }}
                                            />
                                          </span>
                                        ) : subCrit.maxA4 !== undefined ? (
                                          <span style={{ 
                                            background: '#dbeafe', 
                                            color: '#1e40af',
                                            padding: '0.1rem 0.3rem',
                                            borderRadius: '3px',
                                            fontWeight: 500
                                          }}>
                                            Max {subCrit.maxA4} A4
                                          </span>
                                        ) : null}
                                      </div>
                                      {/* Source reference en expand arrow */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {subCrit.sourceReference && (
                                      <div 
                                        style={{ 
                                          fontSize: '0.75rem', 
                                          color: '#8b5cf6',
                                          background: '#f3e8ff',
                                          padding: '0.2rem 0.4rem',
                                          borderRadius: '3px',
                                          cursor: 'help'
                                        }}
                                        title={`Bron: ${subCrit.sourceReference}`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {subCrit.sourceReference}
                                      </div>
                                    )}
                                        <div style={{ color: '#a78bfa', fontSize: '0.9rem' }}>
                                      {isExpanded ? '▼' : '▶'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Assessment points (expanded) */}
                                {isExpanded && subCrit.assessmentPoints && subCrit.assessmentPoints.length > 0 && (
                                  <div style={{ marginTop: '0.25rem', marginLeft: '1rem' }}>
                                    <div style={{ 
                                      padding: '0.5rem',
                                      background: '#faf5ff',
                                      borderLeft: '3px solid #c084fc',
                                      borderRadius: '4px'
                                    }}>
                                      <ul style={{ margin: 0, paddingLeft: editingExtractedCriteria ? 0 : '1.25rem', fontSize: '0.85rem', color: '#4b5563', listStyle: editingExtractedCriteria ? 'none' : 'disc' }}>
                                        {subCrit.assessmentPoints.map((point, pIdx) => (
                                          <li key={pIdx} style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {editingExtractedCriteria ? (
                                              <>
                                                <input
                                                  type="text"
                                                  value={point}
                                                  onChange={(e) => {
                                                    const newCriteria = [...extractedCriteria];
                                                    newCriteria[idx].subCriteria[subIdx].assessmentPoints[pIdx] = e.target.value;
                                                    setExtractedCriteria(newCriteria);
                                                  }}
                                                  style={{ 
                                                    flex: 1,
                                                    padding: '0.25rem',
                                                    fontSize: '0.85rem',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '3px'
                                                  }}
                                                />
                                                <button
                                                  onClick={() => {
                                                    const newCriteria = [...extractedCriteria];
                                                    newCriteria[idx].subCriteria[subIdx].assessmentPoints.splice(pIdx, 1);
                                                    setExtractedCriteria(newCriteria);
                                                  }}
                                                  style={{
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    padding: '0.25rem 0.5rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                  }}
                                                  title="Verwijder deze deelvraag"
                                                >
                                                  ×
                                                </button>
                                              </>
                                            ) : (
                                              point
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                      {editingExtractedCriteria && (
                                        <button
                                          onClick={() => {
                                            const newCriteria = [...extractedCriteria];
                                            newCriteria[idx].subCriteria[subIdx].assessmentPoints.push('Nieuwe deelvraag');
                                            setExtractedCriteria(newCriteria);
                                          }}
                                          style={{
                                            marginTop: '0.5rem',
                                            padding: '0.35rem 0.6rem',
                                            fontSize: '0.8rem',
                                            background: '#701c74',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            width: '100%'
                                          }}
                                        >
                                          + Nieuwe deelvraag toevoegen
                                        </button>
                                      )}
                                    </div>
                                    {!editingExtractedCriteria && (
                                      <button
                                        className="btn btn-secondary"
                                        style={{ 
                                          fontSize: '0.8rem', 
                                          padding: '0.35rem 0.6rem', 
                                          marginTop: '0.5rem',
                                          width: '100%'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Kopieer naar AI Context veld
                                          const questionText = `${criterion.title}\n\n${subCrit.title}\n\nBeoordelingspunten:\n${subCrit.assessmentPoints.map(p => `- ${p}`).join('\n')}`;
                                          
                                          if (selectedCriterionId) {
                                            const currentCriterion = criteria.find(c => c.id === selectedCriterionId);
                                            const newContext = (currentCriterion?.aiContext || '') + '\n\n' + questionText;
                                            setCriteria(prev => prev.map(c => 
                                              c.id === selectedCriterionId ? { ...c, aiContext: newContext.trim() } : c
                                            ));
                                            setHasUnsavedChanges(true);
                                            alert('Toegevoegd aan AI Instructies!');
                                          } else {
                                            alert('Selecteer eerst een criterium tab om dit toe te voegen');
                                          }
                                        }}
                                      >
                                        ↓ Kopieer naar AI Instructies
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Button to add new sub-criterion (deelvraag) */}
                          {editingExtractedCriteria && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newCriteria = [...extractedCriteria];
                                newCriteria[idx].subCriteria.push({
                                  title: 'Nieuwe deelvraag',
                                  weight: undefined,
                                  points: undefined,
                                  sourceReference: '',
                                  maxA4: 1,
                                  assessmentPoints: ['Beschrijf hier de beoordelingspunten']
                                });
                                setExtractedCriteria(newCriteria);
                              }}
                              style={{
                                marginTop: '0.75rem',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.85rem',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                width: '100%',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <span style={{ fontSize: '1.1rem' }}>+</span>
                              Nieuwe deelvraag toevoegen aan {criterion.title.slice(0, 30)}...
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Belangrijke Data */}
            {extractedKeyData.length > 0 && (
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div 
                  onClick={() => setKeyDataExpanded(!keyDataExpanded)}
                  style={{ 
                    padding: '0.75rem', 
                    background: '#701c74', 
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                      Belangrijke Data & Informatie
                    </h3>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.9 }}>
                      {extractedKeyData.reduce((sum, cat) => sum + cat.items.length, 0)} datapunten
                    </div>
                  </div>
                  <div style={{ fontSize: '1.2rem' }}>
                    {keyDataExpanded ? '▼' : '▶'}
                  </div>
                </div>
                {keyDataExpanded && (
                <div style={{ padding: '0.75rem' }}>
                  {extractedKeyData.map((category, idx) => (
                    <div key={idx} style={{ marginBottom: idx < extractedKeyData.length - 1 ? '1rem' : 0 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        marginBottom: '0.5rem', 
                        color: '#4b5563', 
                        fontSize: '0.9rem',
                        paddingBottom: '0.25rem',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        {category.category}
                      </div>
                      <div style={{ paddingLeft: '0.5rem' }}>
                        {category.items.map((item, iIdx) => (
                          <div key={iIdx} style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '140px 1fr', 
                            gap: '0.75rem', 
                            marginBottom: '0.5rem', 
                            fontSize: '0.85rem',
                            padding: '0.5rem',
                            background: '#f9fafb',
                            borderRadius: '4px'
                          }}>
                            <div style={{ color: '#6b7280', fontWeight: 500 }}>{item.label}</div>
                            <div style={{ color: '#111827', fontWeight: 400 }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source Viewer Modal */}
      {sourceViewerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setSourceViewerOpen(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
                  📄 Brondocument
                </h2>
                {sourceViewerData && (
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {sourceViewerData.document.title}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSourceViewerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.75rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '1.5rem'
            }}>
              {sourceViewerLoading && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                  <div style={{ marginBottom: '1rem' }}>⏳</div>
                  <div>Document wordt geladen...</div>
                </div>
              )}

              {!sourceViewerLoading && sourceViewerData && (
                <div>
                  {/* Info banner */}
                  {sourceViewerData.highlightChunks.length > 0 && (
                    <div style={{
                      background: '#fef3c7',
                      border: '1px solid #fbbf24',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      marginBottom: '1.5rem',
                      fontSize: '0.9rem',
                      color: '#92400e'
                    }}>
                      <strong>✨ {sourceViewerData.highlightChunks.length} fragment{sourceViewerData.highlightChunks.length !== 1 ? 'en' : ''} gemarkeerd</strong>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                        De gele achtergrond geeft aan welke tekstdelen de AI heeft gebruikt
                      </div>
                    </div>
                  )}

                  {/* Document chunks */}
                  <div style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {sourceViewerData.chunks.map((chunk, idx) => {
                      const isHighlighted = sourceViewerData.highlightChunks.includes(chunk.index);
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '1rem 1.25rem',
                            background: isHighlighted ? '#fef3c7' : 'white',
                            borderLeft: isHighlighted ? '4px solid #fbbf24' : '4px solid transparent',
                            borderBottom: idx < sourceViewerData.chunks.length - 1 ? '1px solid #e5e7eb' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{
                            fontSize: '0.75rem',
                            color: isHighlighted ? '#92400e' : '#9ca3af',
                            marginBottom: '0.5rem',
                            fontWeight: isHighlighted ? 600 : 400
                          }}>
                            {chunk.pageNumber && `Pagina ${chunk.pageNumber} • `}
                            Fragment {chunk.index + 1}
                            {isHighlighted && ' • ✨ Gebruikt door AI'}
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            lineHeight: 1.6,
                            color: '#111827',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                          }}>
                            {chunk.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer info */}
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: '#6b7280'
                  }}>
                    <strong>Totaal {sourceViewerData.document.totalChunks} fragmenten</strong> in dit document.
                    {sourceViewerData.highlightChunks.length > 0 && (
                      <span> De AI heeft {sourceViewerData.highlightChunks.length} daarvan gebruikt voor tekstgeneratie.</span>
                    )}
                  </div>
                </div>
              )}

              {!sourceViewerLoading && !sourceViewerData && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                  <div style={{ marginBottom: '1rem' }}>⚠️</div>
                  <div>Fout bij het laden van het document</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                className="btn btn-primary"
                onClick={() => setSourceViewerOpen(false)}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
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


function ExportButtons({ 
  clientId, 
  tenderId, 
  stage, 
  criteria,
  sources 
}: { 
  clientId: string; 
  tenderId: string; 
  stage: string;
  criteria?: Array<{ id: string; title?: string; content?: string }>;
  sources?: Array<{ label: string; title?: string; url?: string; chunks?: Array<{ pageNumber?: number }> }>;
}) {
  // Resolve bidId via API
  const getBidId = async (): Promise<string|undefined> => {
    try {
      const res = await fetch(`/api/clients/${clientId}/tenders`);
      const json = await res.json();
      if (!res.ok || !json.success) return undefined;
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      return item?.bid?.id;
    } catch { return undefined; }
  };
  
  const exportDocx = async () => {
    const bidId = await getBidId();
    if (!bidId) {
      alert('Kon bid niet vinden');
      return;
    }
    
    try {
      // Use POST with current criteria data
      const response = await fetch(`/api/bids/${bidId}/stages/${stage}/export/docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: criteria || [], sources: sources || [] })
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Download the blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bid_${bidId}_${stage}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export mislukt');
    }
  };
  
  const exportPdf = async () => {
    const bidId = await getBidId();
    if (!bidId) {
      alert('Kon bid niet vinden');
      return;
    }
    // PDF still uses GET (can be updated later if needed)
    const a = document.createElement('a');
    a.href = `/api/bids/${bidId}/stages/${stage}/export/pdf`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
  };
  
  return (
    <div style={{ display:'inline-flex', gap:6 }}>
      <button className="btn btn-secondary" onClick={exportDocx}>Export DOCX</button>
      <button className="btn btn-secondary" onClick={exportPdf}>Export PDF</button>
    </div>
  );
}

