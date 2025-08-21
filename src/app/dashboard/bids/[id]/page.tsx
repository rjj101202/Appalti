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

            {/* Grid layout in Appalti stijl */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1rem' }}>
              <section>
                <h3>Opdrachtgever</h3>
                <div className="kv-list">
                  <div><span>Naam</span><span>{data.summary?.buyer || '-'}</span></div>
                  <div><span>Website</span><span>{data.summary?.buyerWebsite ? <a href={data.summary.buyerWebsite} target="_blank" rel="noreferrer">{data.summary.buyerWebsite}</a> : '-'}</span></div>
                  <div><span>Bedrijfs-ID</span><span>{data.summary?.buyerCompanyId || '-'}</span></div>
                  <div><span>Contact</span><span>{data.summary?.contactName || '-'}{data.summary?.contactTelephone ? `, ${data.summary.contactTelephone}` : ''}{data.summary?.contactEmail ? `, ${data.summary.contactEmail}` : ''}</span></div>
                  <div><span>Adres</span><span>{data.summary?.addressStreet || '-'}{data.summary?.addressPostalCode ? `, ${data.summary.addressPostalCode}` : ''}</span></div>
                  <div><span>Plaats</span><span>{data.summary?.city || '-'}{data.summary?.countryCode ? `, ${data.summary.countryCode}` : ''}</span></div>
                  <div><span>NUTS</span><span>{Array.isArray(data.summary?.nutsCodes) && data.summary?.nutsCodes.length ? data.summary.nutsCodes.join(', ') : '-'}</span></div>
                </div>
              </section>

              <section>
                <h3>Tender</h3>
                <div className="kv-list">
                  <div><span>CPV</span><span>{Array.isArray(data.summary?.cpvCodes) && data.summary.cpvCodes.length ? data.summary.cpvCodes.join(', ') : '-'}</span></div>
                  <div><span>Type</span><span>{data.summary?.procurementTypeCode || '-'}</span></div>
                  <div><span>Publicatie</span><span>{data.summary?.publicationIssueDate || '-'} {data.summary?.publicationIssueTime || ''}</span></div>
                  <div><span>Deadline</span><span>{data.summary?.deadlineDate || '-'} {data.summary?.deadlineTime || ''}</span></div>
                  <div><span>Portal</span><span>{data.summary?.sourceUrl ? <a href={data.summary.sourceUrl} target="_blank" rel="noreferrer">TenderNed</a> : '-'}</span></div>
                  <div><span>Submission</span><span>{data.summary?.submissionMethodCode || '-'}</span></div>
                </div>
              </section>

              <section>
                <h3>Publicatie & Juridisch</h3>
                <div className="kv-list">
                  <div><span>Notice ID</span><span>{data.summary?.noticeId || '-'}</span></div>
                  <div><span>Versie</span><span>{data.summary?.versionId || '-'}</span></div>
                  <div><span>UBL</span><span>{data.summary?.ublVersionId || '-'}</span></div>
                  <div><span>Customization</span><span>{data.summary?.customizationId || '-'}</span></div>
                  <div><span>Regime</span><span>{data.summary?.regulatoryDomain || '-'}</span></div>
                  <div><span>Notice subtype</span><span>{data.summary?.noticeSubTypeCode || '-'}</span></div>
                  <div><span>Taal</span><span>{data.summary?.noticeLanguageCode || '-'}</span></div>
                </div>
              </section>

              <section>
                <h3>Contactpunt (Rechtsmiddel)</h3>
                <div className="kv-list">
                  <div><span>Naam</span><span>{data.summary?.touchPointName || '-'}</span></div>
                  <div><span>Website</span><span>{data.summary?.touchPointWebsite ? <a href={data.summary.touchPointWebsite} target="_blank" rel="noreferrer">{data.summary.touchPointWebsite}</a> : '-'}</span></div>
                  <div><span>Tel</span><span>{data.summary?.touchPointTelephone || '-'}</span></div>
                  <div><span>E‑mail</span><span>{data.summary?.touchPointEmail || '-'}</span></div>
                  <div><span>Adres</span><span>{data.summary?.touchPointAddressStreet || '-'}{data.summary?.touchPointAddressPostalCode ? `, ${data.summary.touchPointAddressPostalCode}` : ''}</span></div>
                  <div><span>Plaats</span><span>{data.summary?.touchPointCity || '-'}</span></div>
                </div>
              </section>

              {Array.isArray(data.summary?.documentLinks) && data.summary.documentLinks.length > 0 && (
                <section style={{ gridColumn: '1 / -1' }}>
                  <h3>Documenten</h3>
                  <ul>
                    {data.summary.documentLinks.map((u: string, i: number) => (
                      <li key={i}><a href={u} target="_blank" rel="noreferrer">{u}</a></li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Debug sectie: links naar beide bronnen */}
              <section style={{ gridColumn: '1 / -1' }}>
                <h3>Bronnen</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <a className="btn btn-secondary" href={`/api/bids/sources/tenderned/${encodeURIComponent(id)}?raw=1`} target="_blank" rel="noreferrer">Bekijk XML (raw)</a>
                  {data.publicLink && (
                    <a className="btn btn-secondary" href={data.publicLink} target="_blank" rel="noreferrer">TenderNed pagina</a>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

