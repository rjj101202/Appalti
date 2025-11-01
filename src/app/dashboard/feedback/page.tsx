'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function FeedbackPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAppaltiUser = (session as any)?.user?.isAppaltiUser;

  useEffect(() => {
    if (!isAppaltiUser) {
      router.push('/dashboard');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/feedback');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Laden mislukt');
        setFeedbacks(json.data || []);
      } catch (e: any) {
        setError(e?.message || 'Laden mislukt');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAppaltiUser, router]);

  const downloadCSV = () => {
    window.open('/api/feedback?format=csv', '_blank');
  };

  if (!isAppaltiUser) return null;

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="header-section">
          <h1>Feedback</h1>
          <p>Overzicht van feedback van gebruikers</p>
          <button className="btn btn-primary" onClick={downloadCSV} style={{ marginTop: '0.75rem' }}>
            Download als CSV
          </button>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#6b7280' }}>Laden...</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Gebruiker</th>
                  <th>Pagina</th>
                  <th>Rating</th>
                  <th>Bericht</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ color: '#6b7280', textAlign: 'center' }}>Geen feedback ontvangen</td>
                  </tr>
                )}
                {feedbacks.map((f) => (
                  <tr key={f._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(f.createdAt).toLocaleString('nl-NL', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <div>{f.userName || f.userEmail}</div>
                      <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{f.userEmail}</div>
                    </td>
                    <td style={{ fontSize: '0.85em', color: '#6b7280' }}>{f.page || '–'}</td>
                    <td>
                      {f.rating ? (
                        <span style={{ color: '#fbbf24' }}>{'★'.repeat(f.rating)}</span>
                      ) : '–'}
                    </td>
                    <td style={{ maxWidth: 400 }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{f.message}</div>
                    </td>
                    <td>
                      <span className={`badge ${f.status === 'new' ? 'badge-warning' : 'badge-success'}`}>
                        {f.status || 'new'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

