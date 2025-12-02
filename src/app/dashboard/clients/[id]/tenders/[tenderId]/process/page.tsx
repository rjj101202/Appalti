'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

type Stage = 'storyline' | 'version_65' | 'version_95' | 'final';

interface KickoffData {
  leidraadDocument?: {
    name: string;
    url: string;
    uploadedAt: Date;
  };
  generatedContent?: string;
  generatedAt?: Date;
  extractedData?: any;
  status: 'empty' | 'document_uploaded' | 'generating' | 'generated' | 'error';
  error?: string;
}

export default function BidProcessPage() {
  const { id: clientId, tenderId } = useParams<{ id: string; tenderId: string }>();
  const router = useRouter();
  const [bid, setBid] = useState<any>(null);
  const [tenderMeta, setTenderMeta] = useState<{ externalId?: string; deadline?: string; summary?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Kick-off state
  const [kickoff, setKickoff] = useState<KickoffData>({ status: 'empty' });
  const [uploadingKickoff, setUploadingKickoff] = useState(false);
  const [generatingKickoff, setGeneratingKickoff] = useState(false);
  const [showKickoffModal, setShowKickoffModal] = useState(false);
  const kickoffFileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/tenders`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      setBid(item?.bid || null);
      
      // Load kick-off data if bid exists
      if (item?.bid?.id) {
        try {
          const kickoffRes = await fetch(`/api/bids/${item.bid.id}/kickoff`, { cache: 'no-store' });
          const kickoffJson = await kickoffRes.json();
          if (kickoffRes.ok && kickoffJson.success) {
            setKickoff(kickoffJson.data || { status: 'empty' });
          }
        } catch { /* ignore */ }
      }
      
      // Load TenderNed summary when available
      try {
        const externalId = item?.externalId;
        const deadline = item?.deadline || '';
        if (externalId) {
          const r2 = await fetch(`/api/bids/sources/tenderned/${encodeURIComponent(externalId)}`, { cache: 'no-store' });
          const j2 = await r2.json();
          const summary = r2.ok && j2?.success ? j2.summary : undefined;
          setTenderMeta({ externalId, deadline, summary });
        } else {
          setTenderMeta({ externalId, deadline, summary: undefined });
        }
      } catch { /* ignore */ }
    } catch (e: any) {
      setError(e?.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clientId, tenderId]);

  // Kick-off document upload
  const handleKickoffUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bid?.id) return;
    
    try {
      setUploadingKickoff(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/bids/${bid.id}/kickoff/upload`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Upload mislukt');
      }
      
      setKickoff(prev => ({
        ...prev,
        leidraadDocument: {
          name: json.data.name,
          url: json.data.url,
          uploadedAt: new Date()
        },
        status: 'document_uploaded'
      }));
    } catch (err: any) {
      alert(err.message || 'Upload mislukt');
    } finally {
      setUploadingKickoff(false);
      if (kickoffFileInputRef.current) {
        kickoffFileInputRef.current.value = '';
      }
    }
  };

  // Generate kick-off document
  const handleGenerateKickoff = async () => {
    if (!bid?.id) return;
    
    try {
      setGeneratingKickoff(true);
      setKickoff(prev => ({ ...prev, status: 'generating' }));
      
      const res = await fetch(`/api/bids/${bid.id}/kickoff/generate`, {
        method: 'POST'
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Genereren mislukt');
      }
      
      setKickoff(prev => ({
        ...prev,
        extractedData: json.data.extractedData,
        generatedContent: json.data.generatedContent,
        generatedAt: new Date(),
        status: 'generated'
      }));
      
      // Open modal to show generated content
      setShowKickoffModal(true);
    } catch (err: any) {
      setKickoff(prev => ({ ...prev, status: 'error', error: err.message }));
      alert(err.message || 'Genereren mislukt');
    } finally {
      setGeneratingKickoff(false);
    }
  };

  const submitStage = async (stage: Stage) => {
    if (!bid?.id) return;
    try {
      const res = await fetch(`/api/bids/${bid.id}/stages/${stage}/submit`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Actie mislukt');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Actie mislukt');
    }
  }

  const StageCard = ({ stage, title, description }: { stage: Stage; title: string; description: string }) => {
    const disabled = stageDisabled(stage, bid);
    const status = getStageStatus(stage, bid);
    return (
      <div className="card">
        <h3 style={{ marginBottom: '0.25rem' }}>{title}</h3>
        <p style={{ color: '#6b7280', marginBottom: '0.75rem' }}>{description}</p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${status === 'approved' ? 'badge-success' : status === 'submitted' ? 'badge-info' : 'badge-warning'}`}>{status}</span>
          <button className="btn btn-secondary" disabled={disabled} onClick={() => submitStage(stage)}>
            {status === 'draft' ? 'Markeer als gereed' : 'Opnieuw indienen'}
          </button>
          <button className="btn btn-secondary" onClick={() => router.push(`/dashboard/clients/${clientId}/tenders/${tenderId}/process/${stage}`)}>Bewerken</button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <button className="btn btn-secondary" onClick={() => router.push(`/dashboard/clients/${clientId}/bids`)}>← Terug</button>
        <h1 style={{ marginTop: '1rem' }}>Bid proces</h1>
        {loading && <p>Laden...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && !error && (
          <div className="action-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {/* Tender meta */}
            <div className="card" style={{ gridColumn: 'span 2', marginBottom: '0.5rem' }}>
              <h3 style={{ marginBottom: 6 }}>Tendergegevens</h3>
              {tenderMeta ? (
                <div style={{ display:'flex', gap: '2rem', flexWrap:'wrap', color:'#374151' }}>
                  <div>
                    <div style={{ fontSize:12, color:'#6b7280' }}>Inschrijfdeadline</div>
                    <div>
                      {(() => {
                        const dateStr = tenderMeta.summary?.deadlineDate || tenderMeta.deadline;
                        if (!dateStr) return '–';
                        try {
                          // Extract only the date part (YYYY-MM-DD) from ISO strings
                          const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
                          if (match) return match[1];
                          // Fallback: parse and format
                          const d = new Date(dateStr);
                          if (isNaN(d.getTime())) return '–';
                          return d.toISOString().split('T')[0];
                        } catch {
                          return '–';
                        }
                      })()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:'#6b7280' }}>Publicatie</div>
                    <div>
                      {(() => {
                        const dateStr = tenderMeta.summary?.publicationIssueDate;
                        if (!dateStr) return '–';
                        try {
                          // Extract only the date part (YYYY-MM-DD) from ISO strings
                          const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
                          if (match) return match[1];
                          // Fallback: parse and format
                          const d = new Date(dateStr);
                          if (isNaN(d.getTime())) return '–';
                          return d.toISOString().split('T')[0];
                        } catch {
                          return '–';
                        }
                      })()}
                    </div>
                  </div>
                  {tenderMeta.summary?.buyer && (
                    <div>
                      <div style={{ fontSize:12, color:'#6b7280' }}>Aanbestedende dienst</div>
                      <div>{tenderMeta.summary.buyer}</div>
                    </div>
                  )}
                  {tenderMeta.externalId && (
                    <div>
                      <a className="btn btn-secondary" href={`https://www.tenderned.nl/aankondigingen/overzicht/${encodeURIComponent(tenderMeta.externalId)}`} target="_blank" rel="noreferrer">Bekijk op TenderNed</a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color:'#6b7280' }}>Geen tendergegevens beschikbaar.</div>
              )}
            </div>
            
            {/* Kick-Off Card - kleiner blok tussen tendergegevens en stages */}
            <div 
              className="card" 
              style={{ 
                gridColumn: 'span 1', 
                marginBottom: '0.5rem',
                background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                border: '1px solid #fde047'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📋</span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Kick-Off</h3>
              </div>
              
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                Upload de aanbestedingsleidraad om automatisch een kick-off document te genereren.
              </p>
              
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={kickoffFileInputRef}
                onChange={handleKickoffUpload}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Upload status */}
                {kickoff.leidraadDocument && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.5rem',
                    background: 'white',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}>
                    <span>📄</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {kickoff.leidraadDocument.name}
                    </span>
                    <a 
                      href={kickoff.leidraadDocument.url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ color: '#2563eb', fontSize: '0.75rem' }}
                    >
                      Bekijken
                    </a>
                  </div>
                )}
                
                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => kickoffFileInputRef.current?.click()}
                    disabled={uploadingKickoff}
                    style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                  >
                    {uploadingKickoff ? 'Uploaden...' : (kickoff.leidraadDocument ? 'Vervangen' : 'Upload leidraad')}
                  </button>
                  
                  {kickoff.leidraadDocument && (
                    <button 
                      className="btn" 
                      onClick={handleGenerateKickoff}
                      disabled={generatingKickoff}
                      style={{ 
                        fontSize: '0.875rem', 
                        padding: '0.375rem 0.75rem',
                        background: '#eab308',
                        color: '#1c1917',
                        border: 'none'
                      }}
                    >
                      {generatingKickoff ? 'Genereren...' : (kickoff.status === 'generated' ? 'Opnieuw genereren' : 'Genereer kick-off')}
                    </button>
                  )}
                  
                  {kickoff.status === 'generated' && (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setShowKickoffModal(true)}
                      style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                    >
                      Bekijken
                    </button>
                  )}
                </div>
                
                {/* Status badge */}
                {kickoff.status && kickoff.status !== 'empty' && (
                  <span 
                    className={`badge ${
                      kickoff.status === 'generated' ? 'badge-success' : 
                      kickoff.status === 'generating' ? 'badge-info' : 
                      kickoff.status === 'error' ? 'badge-error' : 
                      'badge-warning'
                    }`}
                    style={{ alignSelf: 'flex-start', fontSize: '0.75rem' }}
                  >
                    {kickoff.status === 'generated' ? 'Gegenereerd' :
                     kickoff.status === 'generating' ? 'Bezig...' :
                     kickoff.status === 'error' ? 'Fout' :
                     kickoff.status === 'document_uploaded' ? 'Document geüpload' : 
                     kickoff.status}
                  </span>
                )}
                
                {kickoff.error && (
                  <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: 0 }}>{kickoff.error}</p>
                )}
              </div>
            </div>
            
            {/* Spacer div for grid alignment */}
            <div style={{ gridColumn: 'span 1' }} />
            
            <StageCard stage="storyline" title="Storyline" description="Eerste versie van het aanbestedingsdocument." />
            <StageCard stage="version_65" title="65% versie" description="Inhoud en structuur grotendeels compleet." />
            <StageCard stage="version_95" title="95% versie" description="Bijna definitief; laatste checks." />
            <StageCard stage="final" title="Finish" description="Definitieve indiening gereedmaken en versturen." />
          </div>
        )}
        
        {/* Kick-Off Modal */}
        {showKickoffModal && kickoff.generatedContent && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem'
            }}
            onClick={() => setShowKickoffModal(false)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '12px',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>📋 Kick-Off Document</h2>
                <button 
                  onClick={() => setShowKickoffModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>
              <div 
                style={{
                  padding: '1.5rem',
                  overflow: 'auto',
                  flex: 1
                }}
              >
                <style>{`
                  .kickoff-document h1 { font-size: 1.5rem; margin-bottom: 1.5rem; color: #1f2937; }
                  .kickoff-document h2 { font-size: 1.125rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
                  .kickoff-document p { color: #4b5563; line-height: 1.6; margin-bottom: 0.75rem; }
                  .kickoff-document ul, .kickoff-document ol { padding-left: 1.5rem; color: #4b5563; }
                  .kickoff-document li { margin-bottom: 0.375rem; }
                  .kickoff-document .info-table { width: 100%; margin-bottom: 1.5rem; border-collapse: collapse; }
                  .kickoff-document .info-table td { padding: 0.5rem; border-bottom: 1px solid #f3f4f6; }
                  .kickoff-document .info-table td:first-child { width: 200px; color: #6b7280; }
                  .kickoff-document .planning-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
                  .kickoff-document .planning-table th, .kickoff-document .planning-table td { padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #e5e7eb; }
                  .kickoff-document .planning-table th { background: #f9fafb; font-weight: 600; color: #374151; }
                  .kickoff-document .planning-table td { color: #4b5563; }
                `}</style>
                <div dangerouslySetInnerHTML={{ __html: kickoff.generatedContent }} />
              </div>
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    // Copy to clipboard
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = kickoff.generatedContent || '';
                    navigator.clipboard.writeText(tempDiv.textContent || '');
                    alert('Tekst gekopieerd naar klembord');
                  }}
                >
                  Kopieer tekst
                </button>
                <button 
                  className="btn"
                  onClick={() => setShowKickoffModal(false)}
                  style={{ background: '#2563eb', color: 'white', border: 'none' }}
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function getStageStatus(stage: Stage, bid: any): string {
  const s = bid?.stages?.find((x: any) => x.key === stage);
  return s?.status || 'draft';
}

function stageDisabled(stage: Stage, bid: any): boolean {
  const order: Stage[] = ['storyline','version_65','version_95','final'];
  const idx = order.indexOf(stage);
  if (idx <= 0) return false;
  const prev = order[idx - 1];
  const prevStatus = getStageStatus(prev, bid);
  return !(prevStatus === 'submitted' || prevStatus === 'approved');
}

