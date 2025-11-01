'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ clients: 0, activeTenders: 0, teamMembers: 1 });
  const [activeTenders, setActiveTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load stats in parallel
      const [clientsRes, workRes, teamRes] = await Promise.allSettled([
        fetch('/api/clients?limit=100'),
        fetch('/api/users/me/work'),
        fetch('/api/companies/_/members')
      ]);

      let clientCount = 0;
      if (clientsRes.status === 'fulfilled') {
        const data = await clientsRes.value.json();
        clientCount = data.data?.length || 0;
      }

      let tenders: any[] = [];
      if (workRes.status === 'fulfilled') {
        const data = await workRes.value.json();
        if (data.success) {
          // Filter only non-expired tenders
          const now = new Date();
          tenders = (data.data || []).filter((t: any) => {
            if (!t.tenderDeadline) return true; // No deadline = keep
            const deadline = new Date(t.tenderDeadline);
            return deadline >= now; // Only future deadlines
          }).slice(0, 5); // Max 5 for dashboard
        }
      }

      let teamCount = 1;
      if (teamRes.status === 'fulfilled') {
        const data = await teamRes.value.json();
        teamCount = data.data?.filter((m: any) => m.isActive)?.length || 1;
      }

      setStats({
        clients: clientCount,
        activeTenders: tenders.length,
        teamMembers: teamCount
      });
      setActiveTenders(tenders);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div>
        {/* Welcome Section */}
        <div className="welcome-card">
          <h1>Welkom bij Appalti AI</h1>
          <p>Beheer uw aanbestedingen en optimaliseer uw sales proces met AI</p>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="stat-title">Client Companies</h3>
            </div>
            <p className="stat-value">{loading ? '...' : stats.clients}</p>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="stat-title">Actieve Tenders</h3>
            </div>
            <p className="stat-value">{loading ? '...' : stats.activeTenders}</p>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="stat-title">Win Rate</h3>
            </div>
            <p className="stat-value">-</p>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="stat-title">Team Leden</h3>
            </div>
            <p className="stat-value">{loading ? '...' : stats.teamMembers}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="action-grid">
          <a href="/dashboard/clients/new" className="action-card">
            <h3>Nieuwe Client Company</h3>
            <p>Voeg een nieuwe client company toe en vul het IKP in</p>
          </a>
          <a href="/dashboard/bids" className="action-card">
            <h3>Tender Matching</h3>
            <p>Bekijk nieuwe tender matches voor uw clients</p>
          </a>
          <a href="/dashboard/team" className="action-card">
            <h3>Team Beheer</h3>
            <p>Nodig teamleden uit en beheer rollen</p>
          </a>
        </div>

        {/* Active Tenders */}
        {!loading && activeTenders.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Mijn Actieve Tenders</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {activeTenders.map((tender: any) => {
                const deadline = tender.tenderDeadline ? new Date(tender.tenderDeadline) : null;
                const daysUntil = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const isUrgent = daysUntil !== null && daysUntil < 7;
                const isWarning = daysUntil !== null && daysUntil >= 7 && daysUntil < 14;

                return (
                  <div
                    key={tender.bidId}
                    className="card"
                    style={{
                      padding: '1rem',
                      borderLeft: `4px solid ${isUrgent ? '#dc2626' : isWarning ? '#f59e0b' : '#8b1c6d'}`,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s'
                    }}
                    onClick={() => router.push(`/dashboard/clients/${tender.clientId}/tenders/${tender.tenderId}/process`)}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1em' }}>{tender.tenderTitle}</h3>
                      {daysUntil !== null && (
                        <span style={{
                          fontSize: '0.9em',
                          fontWeight: 600,
                          color: isUrgent ? '#dc2626' : isWarning ? '#f59e0b' : '#6b7280'
                        }}>
                          {daysUntil >= 0 ? `${daysUntil} dagen` : 'Verlopen'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9em', color: '#6b7280' }}>
                      Client: {tender.clientName}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#8b1c6d' }}>
                        {tender.currentStage}
                      </span>
                      {deadline && (
                        <span style={{ fontSize: '0.85em', color: '#6b7280' }}>
                          Deadline: {deadline.toLocaleDateString('nl-NL')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}