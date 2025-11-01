"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import CPVCodeSelector from '@/components/CPVCodeSelector';
import { formatDateNL } from '@/lib/date-utils';

type BidItem = {
  id: string;
  title: string;
  buyer?: string;
  cpvCodes?: string[];
  sector?: string;
  publicationDate?: string;
  submissionDeadline?: string;
  sourceUrl?: string;
  shortDescription?: string;
  city?: string;
};

export default function BidsPage() {
  const [items, setItems] = useState<BidItem[]>([]);
  const [page, setPage] = useState(0);
  const [nextPage, setNextPage] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', cpv: '', deadlineBefore: '', newSince: '', sector: '', city: '', buyer: '' });
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);

  const load = async (p = 0, append = false) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('size', '20');
      if (filters.q) params.set('q', filters.q);
      if (filters.cpv) params.set('cpv', filters.cpv);
      if (filters.deadlineBefore) params.set('deadlineBefore', filters.deadlineBefore);
      if (filters.newSince) params.set('newSince', filters.newSince);
      const res = await fetch(`/api/bids/sources/tenderned?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Laden mislukt');
      let array = Array.isArray(data.items) ? data.items : [];
      
      // Client-side filtering for sector, city, buyer (not supported by TenderNed API)
      if (filters.sector) {
        const sectorLower = filters.sector.toLowerCase();
        array = array.filter((item: any) => 
          item.sector?.toLowerCase().includes(sectorLower)
        );
      }
      if (filters.city) {
        const cityLower = filters.city.toLowerCase();
        array = array.filter((item: any) => 
          item.city?.toLowerCase().includes(cityLower)
        );
      }
      if (filters.buyer) {
        const buyerLower = filters.buyer.toLowerCase();
        array = array.filter((item: any) => 
          item.buyer?.toLowerCase().includes(buyerLower)
        );
      }
      
      setItems(prev => append ? [...prev, ...array] : array);
      setPage(data.page);
      setNextPage(data.nextPage);
      setTotal(data.total || undefined);
    } catch (e: any) {
      setError(e?.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => load(0, false);

  const openDetail = (id: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(page));
    window.location.href = `/dashboard/bids/${encodeURIComponent(id)}?${params.toString()}`;
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="header-section">
          <h1>Bids</h1>
          <p>Overzicht van openbare aanbestedingen (TenderNed) met filters en paginatie.</p>
        </div>

        {/* Quick Filters */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
            <input placeholder="Zoekterm" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
            <input placeholder="CPV" value={filters.cpv} onChange={e => setFilters({ ...filters, cpv: e.target.value })} />
            <button className="btn btn-primary" onClick={() => setShowFilterModal(true)}>
              🔍 Geavanceerd Filteren
            </button>
          </div>
          {(filters.sector || filters.city || filters.buyer || filters.deadlineBefore || filters.newSince) && (
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {filters.sector && <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#701c74' }}>Sector: {filters.sector}</span>}
              {filters.city && <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#701c74' }}>Stad: {filters.city}</span>}
              {filters.buyer && <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#701c74' }}>Opdrachtgever: {filters.buyer}</span>}
              {filters.deadlineBefore && <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#701c74' }}>Deadline voor: {filters.deadlineBefore}</span>}
              {filters.newSince && <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#701c74' }}>Nieuw sinds: {filters.newSince}</span>}
              <button className="btn btn-secondary" onClick={() => setFilters({ q: '', cpv: '', deadlineBefore: '', newSince: '', sector: '', city: '', buyer: '' })} style={{ fontSize: '0.85em' }}>
                ✕ Wis filters
              </button>
            </div>
          )}
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Totals */}
        <div style={{ marginBottom: '0.5rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Resultaten: {items.length} / 20 {typeof total === 'number' ? `(totaal ≈ ${total})` : ''} — pagina {page + 1}{nextPage ? '' : ' (laatste)'}
          </span>
          <span style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" disabled={page <= 0 || loading} onClick={() => load(Math.max(0, page - 1), false)}>← Vorige</button>
            <button className="btn btn-secondary" disabled={!nextPage || loading} onClick={() => load(nextPage!, false)}>Volgende →</button>
          </span>
        </div>

        {/* List */}
        <div className="data-table" style={{ overflowX: 'auto' }}>
          <table style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Opdrachtgever</th>
                <th>Vraag/Titel</th>
                <th>Publicatie</th>
                <th>Deadline</th>
                <th>Locatie</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const isExpanded = expandedRows.has(b.id);
                return (
                  <>
                    <tr key={b.id} style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }} onClick={() => toggleRow(b.id)}>
                        <span style={{ fontSize: '1.2em', userSelect: 'none' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(b as any).buyer || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 'min(50vw, 520px)' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(b as any).title || '-'}</span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateNL(b.publicationDate)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateNL(b.submissionDeadline)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{(b as any).city || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap', width: 200 }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" onClick={() => openDetail(b.id)}>Details</button>
                          {b.sourceUrl && (
                            <a className="btn btn-secondary" href={b.sourceUrl} target="_blank" rel="noreferrer">TenderNed</a>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${b.id}-expanded`}>
                        <td colSpan={7} style={{ backgroundColor: '#f9fafb', padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#6b7280', marginBottom: '0.25rem' }}>CPV Codes</div>
                              <div style={{ fontSize: '0.95em' }}>
                                {b.cpvCodes && b.cpvCodes.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {[...new Set(b.cpvCodes)].map((code, i) => (
                                      <span key={i} style={{ backgroundColor: '#f3e8ff', color: '#701c74', padding: '0.125rem 0.5rem', borderRadius: 4, fontSize: '0.85em' }}>
                                        {code}
                                      </span>
                                    ))}
                                  </div>
                                ) : '–'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#6b7280', marginBottom: '0.25rem' }}>Sector</div>
                              <div style={{ fontSize: '0.95em' }}>{b.sector || '–'}</div>
                            </div>
                            {b.shortDescription && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#6b7280', marginBottom: '0.25rem' }}>Korte beschrijving</div>
                                <div style={{ fontSize: '0.95em', color: '#374151' }}>{b.shortDescription}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom controls */}
        <div style={{ marginTop: '1rem', textAlign: 'center', color: '#6b7280' }}>Gesorteerd op publicatie (nieuw → oud)</div>

        {/* Advanced Filter Modal */}
        {showFilterModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }} onClick={() => setShowFilterModal(false)}>
            <div className="card" style={{ maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Geavanceerd Filteren</h2>
                <button onClick={() => setShowFilterModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}>×</button>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Zoekterm</label>
                  <input 
                    type="text"
                    placeholder="Zoek in titel en beschrijving..."
                    value={filters.q} 
                    onChange={e => setFilters({ ...filters, q: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>CPV Codes</label>
                  <input 
                    type="text"
                    placeholder="45214200, 48000000"
                    value={filters.cpv} 
                    onChange={e => setFilters({ ...filters, cpv: e.target.value })}
                    style={{ width: '100%' }}
                  />
                  <p style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '0.25rem' }}>Meerdere codes scheiden met komma</p>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Sector</label>
                  <input 
                    type="text"
                    placeholder="Bouw, ICT, Zorg..."
                    value={filters.sector} 
                    onChange={e => setFilters({ ...filters, sector: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Stad/Locatie</label>
                  <input 
                    type="text"
                    placeholder="Amsterdam, Utrecht..."
                    value={filters.city} 
                    onChange={e => setFilters({ ...filters, city: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Opdrachtgever</label>
                  <input 
                    type="text"
                    placeholder="Gemeente, Ministerie..."
                    value={filters.buyer} 
                    onChange={e => setFilters({ ...filters, buyer: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Gepubliceerd vanaf</label>
                    <input 
                      type="date"
                      value={filters.newSince} 
                      onChange={e => setFilters({ ...filters, newSince: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Deadline voor</label>
                    <input 
                      type="date"
                      value={filters.deadlineBefore} 
                      onChange={e => setFilters({ ...filters, deadlineBefore: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      applyFilters();
                      setShowFilterModal(false);
                    }}
                    style={{ flex: 1 }}
                  >
                    Toepassen
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setFilters({ q: '', cpv: '', deadlineBefore: '', newSince: '', sector: '', city: '', buyer: '' });
                      setShowFilterModal(false);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}