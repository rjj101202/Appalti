'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function TeamMemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [work, setWork] = useState<{ bids: any[]; tenders: any[] }>({ bids: [], tenders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.userId) return;
    (async () => {
      try {
        const [membersRes, workRes] = await Promise.all([
          fetch('/api/companies/_/members'),
          fetch(`/api/users/${params.userId}/work`)
        ]);
        const membersJson = await membersRes.json();
        const workJson = await workRes.json();
        if (membersRes.ok && membersJson.success) {
          const m = membersJson.data.find((x: any) => x.userId === params.userId);
          setProfile(m || null);
        }
        if (workRes.ok && workJson.success) setWork(workJson.data);
      } catch (e: any) {
        setError(e?.message || 'Laden mislukt');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.userId]);

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="header-section">
          <button className="btn btn-secondary" onClick={() => router.back()}>
            ← Terug
          </button>
          <h1>Teamlid</h1>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner-small" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Laden...</p>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2>Profiel</h2>
              {profile ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div><strong>Naam:</strong> {profile.name || '-'}</div>
                    <div><strong>E‑mail:</strong> {profile.email || '-'}</div>
                  </div>
                  <div>
                    <div><strong>Rol:</strong> {profile.companyRole}</div>
                    <div><strong>Status:</strong> {profile.isActive ? 'Actief' : 'Inactief'}</div>
                  </div>
                </div>
              ) : (
                <div>Niet gevonden</div>
              )}
            </div>

            <div className="card">
              <h2>Werkzaamheden</h2>
              <p style={{ color: '#6b7280' }}>Tenders en bids worden hier zichtbaar zodra deze modules data leveren.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h3>Bids</h3>
                  {work.bids.length === 0 ? <p>Geen items</p> : <ul>{work.bids.map((b, i) => (<li key={i}>{b.title || b._id}</li>))}</ul>}
                </div>
                <div>
                  <h3>Tenders</h3>
                  {work.tenders.length === 0 ? <p>Geen items</p> : <ul>{work.tenders.map((t, i) => (<li key={i}>{t.title || t._id}</li>))}</ul>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

