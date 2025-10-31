'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

type Stage = 'storyline' | 'version_65' | 'version_95' | 'final';

export default function BidProcessPage() {
  const { id: clientId, tenderId } = useParams<{ id: string; tenderId: string }>();
  const router = useRouter();
  const [bid, setBid] = useState<any>(null);
  const [tenderMeta, setTenderMeta] = useState<{ externalId?: string; deadline?: string; summary?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/tenders`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      setBid(item?.bid || null);
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
        <button className="btn btn-secondary" onClick={() => router.push(`/dashboard/clients/${clientId}`)}>← Terug</button>
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
            <StageCard stage="storyline" title="Storyline" description="Eerste versie van het aanbestedingsdocument." />
            <StageCard stage="version_65" title="65% versie" description="Inhoud en structuur grotendeels compleet." />
            <StageCard stage="version_95" title="95% versie" description="Bijna definitief; laatste checks." />
            <StageCard stage="final" title="Finish" description="Definitieve indiening gereedmaken en versturen." />
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

