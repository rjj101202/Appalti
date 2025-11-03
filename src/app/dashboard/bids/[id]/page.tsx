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
  const [linking, setLinking] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [linkSuccess, setLinkSuccess] = useState(false);

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

  useEffect(() => {
    // fetch clients for linking select
    (async () => {
      try {
        const res = await fetch(`/api/clients?limit=100`);
        const json = await res.json();
        if (res.ok && json.success) {
          const clientList = json.items || json.data || [];
          setClients(clientList);
          
          // Pre-select client from URL parameter (maar NIET auto-linken)
          const clientId = search.get('clientId');
          if (clientId) {
            setSelectedClient(clientId);
            // User kan nu zelf beslissen om te koppelen of terug te gaan
          }
        }
      } catch {}
    })();
  }, [search]);

  const linkTenderWithClient = async (clientId: string) => {
    if (!clientId) return;
    try {
      setLinking(true);
      setError('');
      
      const body = {
        source: 'tenderned',
        externalId: id,
        clientCompanyId: clientId,
        title: data?.summary?.title || `Tender ${id}`,
        cpvCodes: data?.summary?.cpvCodes || [],
        deadline: data?.summary?.deadlineDate || undefined,
        description: data?.summary?.shortDescription || data?.summary?.description || undefined,
      };
      
      const res = await fetch('/api/tenders/link', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Koppelen mislukt');
      
      setLinkSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/clients/${clientId}`);
      }, 2000);
      
    } catch (e: any) {
      setError(e?.message || 'Koppelen mislukt');
    } finally {
      setLinking(false);
    }
  };

  const linkTender = async () => {
    if (!selectedClient) return alert('Selecteer eerst een bedrijf');
    await linkTenderWithClient(selectedClient);
  };

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
        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
        
        {linkSuccess && (
          <div style={{ 
            padding: '1rem', 
            background: '#f0fdf4', 
            border: '2px solid #86efac', 
            borderRadius: '8px',
            marginTop: '1rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>Tender Succesvol Gekoppeld!</h3>
            <p style={{ margin: 0, color: '#15803d' }}>
              Deze tender is gekoppeld aan het bedrijf. Je wordt doorgestuurd naar het tender overzicht...
            </p>
          </div>
        )}
        
        {data && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>{data.summary?.title || `Aanbesteding ${id}`}</h2>
            <p style={{ color: '#6b7280' }}>{data.summary?.shortDescription || data.summary?.description || ''}</p>

            {/* Link to client company */}
            <div style={{ margin: '1rem 0', padding: '1rem', background: '#faf5ff', borderRadius: '8px', border: '2px solid #d8b4fe' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: '#701c74', fontSize: '1.1em' }}>Koppel aan Bedrijf</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select 
                  value={selectedClient} 
                  onChange={e => setSelectedClient(e.target.value)} 
                  style={{ flex: 1, maxWidth: 360 }}
                  disabled={linking || linkSuccess}
                >
                  <option value="">Selecteer een bedrijf...</option>
                  {clients.map((c: any) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary" 
                  disabled={linking || !selectedClient || linkSuccess} 
                  onClick={linkTender}
                >
                  {linking ? 'Koppelen...' : linkSuccess ? 'Gekoppeld ✓' : 'Koppelen & Start Bid Proces'}
                </button>
              </div>
              {selectedClient && !linkSuccess && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85em', color: '#6b7280' }}>
                  Deze tender wordt gekoppeld aan <strong>{clients.find(c => c._id === selectedClient || c.id === selectedClient)?.name}</strong>
                </p>
              )}
            </div>

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
                  <div><span>Geschat bedrag</span><span>{data.summary?.estimatedContractAmount ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: (data.summary?.estimatedContractCurrency || 'EUR') as any, maximumFractionDigits: 0 }).format(Number(data.summary.estimatedContractAmount)) : '-'}</span></div>
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

