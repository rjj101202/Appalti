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
            <h2 style={{ marginTop: 0 }}>{data.summary?.title || `Aanbesteding ${id}`}</h2>
            <p style={{ color: '#6b7280' }}>{data.summary?.shortDescription || data.summary?.description || ''}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <h3>Opdrachtgever</h3>
                <p><strong>Naam:</strong> {data.summary?.buyer || '-'}</p>
                <p><strong>Website:</strong> {data.summary?.buyerWebsite ? <a href={data.summary.buyerWebsite} target="_blank" rel="noreferrer">{data.summary.buyerWebsite}</a> : '-'}</p>
                <p><strong>KvK/ID:</strong> {data.summary?.buyerCompanyId || '-'}</p>
                <p><strong>Contact:</strong> {data.summary?.contactName || '-'}{data.summary?.contactTelephone ? `, ${data.summary.contactTelephone}` : ''}{data.summary?.contactEmail ? `, ${data.summary.contactEmail}` : ''}</p>
                <p><strong>Adres:</strong> {data.summary?.addressStreet || '-'}{data.summary?.addressPostalCode ? `, ${data.summary.addressPostalCode}` : ''}</p>
                <p><strong>Plaats:</strong> {data.summary?.city || '-'}{data.summary?.countryCode ? `, ${data.summary.countryCode}` : ''}</p>
                <p><strong>NUTS:</strong> {Array.isArray(data.summary?.nutsCodes) && data.summary?.nutsCodes.length ? data.summary.nutsCodes.join(', ') : '-'}</p>
              </div>
              <div>
                <h3>Tender</h3>
                <p><strong>CPV:</strong> {Array.isArray(data.summary?.cpvCodes) && data.summary.cpvCodes.length ? data.summary.cpvCodes.join(', ') : '-'}</p>
                <p><strong>Procurement type:</strong> {data.summary?.procurementTypeCode || '-'}</p>
                <p><strong>Publicatie:</strong> {data.summary?.publicationIssueDate || '-'} {data.summary?.publicationIssueTime || ''}</p>
                <p><strong>Deadline:</strong> {data.summary?.deadlineDate || '-'} {data.summary?.deadlineTime || ''}</p>
                <p><strong>Portal:</strong> {data.summary?.sourceUrl ? <a href={data.summary.sourceUrl} target="_blank" rel="noreferrer">TenderNed</a> : '-'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

