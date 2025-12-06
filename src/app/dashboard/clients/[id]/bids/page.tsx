'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatDateNL } from '@/lib/date-utils';
import { InlineLoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ClientBidsOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [titleConfirm, setTitleConfirm] = useState('');
  const [phraseConfirm, setPhraseConfirm] = useState('');

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

  const requiredPhrase = 'Verwijder bid';

  const canDelete = useMemo(() => {
    if (!deleteTarget?.title || !deleteTarget?.bid?.id) return false;
    const normalizedTitle = deleteTarget.title.trim();
    return (
      acknowledged &&
      titleConfirm.trim() === normalizedTitle &&
      phraseConfirm.trim().toUpperCase() === requiredPhrase
    );
  }, [acknowledged, deleteTarget, phraseConfirm, titleConfirm]);

  const openDeleteModal = (item: any) => {
    setDeleteTarget(item);
    setAcknowledged(false);
    setTitleConfirm('');
    setPhraseConfirm('');
    setDeleteError('');
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setAcknowledged(false);
    setTitleConfirm('');
    setPhraseConfirm('');
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!deleteTarget?.bid?.id || !canDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/bids/${deleteTarget.bid.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Verwijderen mislukt');
      }
      setItems(prev => prev.filter(item => item.id !== deleteTarget.id));
      closeDeleteModal();
    } catch (e: any) {
      setDeleteError(e?.message || 'Verwijderen mislukt');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => router.push(`/dashboard/clients/${id}`)}>← Terug</button>
          <h1 style={{ margin: 0 }}>Bid proces</h1>
        </div>

        {loading && <InlineLoadingSpinner />}
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
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateNL(t.deadline)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{t.bid?.currentStage || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Link className="btn btn-secondary" href={`/dashboard/clients/${id}/tenders/${t.id}/process`}>Proces</Link>
                          {t.externalId ? (
                            <Link className="btn btn-secondary" href={`/dashboard/bids/${t.externalId}`}>Details</Link>
                          ) : null}
                          {t.bid?.id && (
                            <button
                              className="btn btn-danger"
                              onClick={() => openDeleteModal(t)}
                              type="button"
                            >
                              Verwijder
                            </button>
                          )}
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

      {deleteTarget && ( // dit eerst blokje is de achtergrond. Een modal is een pop up venster dat je niet kunt negeren. 
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 50,
            padding: '1.5rem'

          }}
        >
          <div // dit is het pop up venster
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)'
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#b91c1c' }}>Bieding definitief verwijderen</h2>
            <p style={{ marginBottom: '0.75rem', color: '#1f2937', lineHeight: 1.5 }}>
              Je staat op het punt om de bid voor <strong>{deleteTarget.title}</strong> definitief te verwijderen.
            </p>

            {deleteError && (
              <div className="error-message" style={{ marginBottom: '0.75rem' }}>{deleteError}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={closeDeleteModal} disabled={deleteLoading} type="button">Annuleer</button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleDelete}
              >
                {deleteLoading ? 'Verwijderen…' : 'Verwijder definitief'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

