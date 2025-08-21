'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

type Stage = 'storyline' | 'version_65' | 'version_80' | 'final';

export default function BidProcessPage() {
  const { id: clientId, tenderId } = useParams<{ id: string; tenderId: string }>();
  const router = useRouter();
  const [bid, setBid] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/tenders`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      setBid(item?.bid || null);
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
            <StageCard stage="storyline" title="Storyline" description="Eerste versie van het aanbestedingsdocument." />
            <StageCard stage="version_65" title="65% versie" description="Inhoud en structuur grotendeels compleet." />
            <StageCard stage="version_80" title="95% versie" description="Bijna definitief; laatste checks." />
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
  const order: Stage[] = ['storyline','version_65','version_80','final'];
  const idx = order.indexOf(stage);
  if (idx <= 0) return false;
  const prev = order[idx - 1];
  const prevStatus = getStageStatus(prev, bid);
  return !(prevStatus === 'submitted' || prevStatus === 'approved');
}

