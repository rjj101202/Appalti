'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function BidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/bids/sources/tenderned/${id}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Laden mislukt');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <DashboardLayout>
      <div className="page-container">
        <button className="btn btn-secondary" onClick={() => {
          const p = search.get('page');
          const qs = p ? `?page=${encodeURIComponent(p)}` : '';
          router.push(`/dashboard/bids${qs}`);
        }}>← Terug</button>
        <h1 style={{ marginTop: '1rem' }}>Aanbesteding {id}</h1>
        {loading && <p>Laden...</p>}
        {error && <p className="error-message">{error}</p>}
        {data && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <p><strong>Opdrachtgever:</strong> {data.summary?.buyer || '-'}</p>
            <p><strong>Titel/Vraag:</strong> {data.summary?.title || '-'}</p>
            <p><strong>Korte omschrijving:</strong> {data.summary?.shortDescription || '-'}</p>
            <div style={{ marginTop: '1rem' }}>
              <a className="btn btn-secondary" href={`/api/bids/sources/tenderned/${encodeURIComponent(id)}?raw=1`} target="_blank" rel="noreferrer">Download XML</a>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

