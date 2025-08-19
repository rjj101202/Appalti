'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';

type BidItem = {
  id: string;
  title: string;
  buyer?: string;
  cpvCodes?: string[];
  sector?: string;
  publicationDate?: string;
  submissionDeadline?: string;
  sourceUrl?: string;
};

export default function BidsPage() {
  const [items, setItems] = useState<BidItem[]>([]);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', cpv: '', deadlineBefore: '', newSince: '' });

  const load = async (p = 1, append = false) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', '20');
      if (filters.q) params.set('q', filters.q);
      if (filters.cpv) params.set('cpv', filters.cpv);
      if (filters.deadlineBefore) params.set('deadlineBefore', filters.deadlineBefore);
      if (filters.newSince) params.set('newSince', filters.newSince);
      const res = await fetch(`/api/bids/sources/tenderned?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Laden mislukt');
      const array = Array.isArray(data.items) ? data.items : [];
      setItems(prev => append ? [...prev, ...array] : array);
      setPage(data.page);
      setNextPage(data.nextPage);
    } catch (e: any) {
      setError(e?.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => load(1, false);

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="header-section">
          <h1>Bids</h1>
          <p>Overzicht van openbare aanbestedingen (TenderNed) met filters en paginatie.</p>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.75rem' }}>
            <input placeholder="Zoekterm" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
            <input placeholder="CPV" value={filters.cpv} onChange={e => setFilters({ ...filters, cpv: e.target.value })} />
            <input type="date" placeholder="Deadline tot" value={filters.deadlineBefore} onChange={e => setFilters({ ...filters, deadlineBefore: e.target.value })} />
            <input type="date" placeholder="Nieuw sinds" value={filters.newSince} onChange={e => setFilters({ ...filters, newSince: e.target.value })} />
            <button className="btn btn-secondary" onClick={applyFilters} disabled={loading}>Filter</button>
          </div>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* List */}
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Titel</th>
                <th>Opdrachtgever</th>
                <th>Branche/CPV</th>
                <th>Publicatie</th>
                <th>Deadline</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td>{b.buyer || '-'}</td>
                  <td>{(b.cpvCodes || []).join(', ') || b.sector || '-'}</td>
                  <td>{b.publicationDate ? new Date(b.publicationDate).toLocaleDateString('nl-NL') : '-'}</td>
                  <td>{b.submissionDeadline ? new Date(b.submissionDeadline).toLocaleDateString('nl-NL') : '-'}</td>
                  <td>
                    {b.sourceUrl ? (
                      <a href={b.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginRight: '0.5rem' }}>Bekijk</a>
                    ) : null}
                    {/* Altijd XML detail aanbieden via proxy */}
                    <a href={`/api/bids/sources/tenderned/${encodeURIComponent(b.id)}`} target="_blank" rel="noreferrer" className="btn btn-secondary">XML</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          {nextPage ? (
            <button className="btn btn-primary" onClick={() => load(nextPage!, true)} disabled={loading}>
              {loading ? 'Laden...' : 'Meer laden'}
            </button>
          ) : (
            <span style={{ color: '#6b7280' }}>Geen extra resultaten</span>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

