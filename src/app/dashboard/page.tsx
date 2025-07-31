'use client';

import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function Dashboard() {
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
              <span className="stat-trend up">+0%</span>
            </div>
            <p className="stat-value">0</p>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="stat-title">Actieve Tenders</h3>
              <span className="stat-trend up">+0%</span>
            </div>
            <p className="stat-value">0</p>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="stat-title">Win Rate</h3>
              <span className="stat-trend up">+0%</span>
            </div>
            <p className="stat-value">0%</p>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="stat-title">Team Leden</h3>
              <span className="stat-trend neutral">0</span>
            </div>
            <p className="stat-value">1</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="action-grid">
          <a href="/dashboard/clients/new" className="action-card">
            <h3>Nieuwe Client Company</h3>
            <p>Voeg een nieuwe client company toe en vul het IKP in</p>
          </a>
          <a href="/dashboard/tenders" className="action-card">
            <h3>Tender Matching</h3>
            <p>Bekijk nieuwe tender matches voor uw clients</p>
          </a>
          <a href="/dashboard/team" className="action-card">
            <h3>Team Beheer</h3>
            <p>Nodig teamleden uit en beheer rollen</p>
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}