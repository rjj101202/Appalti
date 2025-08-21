'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function ClientBidsOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/clients/${id}/tenders`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
        setItems(json.data || []);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => router.push(`/dashboard/clients/${id}`)}>← Terug</button>
          <h1 style={{ margin: 0 }}>Bid proces</h1>
        </div>

        {loading && <p style={{ marginTop: '1rem' }}>Laden...</p>}
        {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}

        {!loading && !error && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Titel</th>
                    <th>Deadline</th>
                    <th>Fase</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ color: '#6b7280' }}>Geen gekoppelde tenders</td>
                    </tr>
                  )}
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td style={{ maxWidth: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{t.deadline ? new Date(t.deadline).toLocaleDateString('nl-NL') : '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{t.bid?.currentStage || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <Link className="btn btn-secondary" href={`/dashboard/clients/${id}/tenders/${t.id}/process`}>Proces</Link>
                          {t.externalId ? (
                            <Link className="btn btn-secondary" href={`/dashboard/bids/${t.externalId}`}>Details</Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

