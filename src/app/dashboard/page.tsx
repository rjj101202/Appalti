'use client';

import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Section */}
        <div style={{ 
          background: 'linear-gradient(to right, #9333ea, #7c3aed)', 
          borderRadius: '8px', 
          padding: '32px', 
          color: 'white' 
        }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>
            Welkom bij Appalti AI
          </h1>
          <p style={{ color: '#e9d5ff' }}>
            Beheer uw aanbestedingen en optimaliseer uw sales proces met AI
          </p>
        </div>

        {/* Quick Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '24px' 
        }}>
          <StatCard
            title="Client Companies"
            value="0"
            trend="+0%"
            trendUp={true}
          />
          <StatCard
            title="Actieve Tenders"
            value="0"
            trend="+0%"
            trendUp={true}
          />
          <StatCard
            title="Win Rate"
            value="0%"
            trend="+0%"
            trendUp={true}
          />
          <StatCard
            title="Team Leden"
            value="1"
            trend="0"
            trendUp={false}
          />
        </div>

        {/* Quick Actions */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '24px' 
        }}>
          <QuickActionCard
            title="Nieuwe Client Company"
            description="Voeg een nieuwe client company toe en vul het IKP in"
            href="/dashboard/clients/new"
          />
          <QuickActionCard
            title="Tender Matching"
            description="Bekijk nieuwe tender matches voor uw clients"
            href="/dashboard/tenders"
          />
          <QuickActionCard
            title="Team Beheer"
            description="Nodig teamleden uit en beheer rollen"
            href="/dashboard/team"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ 
  title, 
  value, 
  trend, 
  trendUp 
}: { 
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '24px', 
      borderRadius: '8px', 
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px' 
      }}>
        <h3 style={{ 
          fontSize: '14px', 
          fontWeight: '500', 
          color: '#6b7280' 
        }}>
          {title}
        </h3>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: '500', 
          color: trendUp ? '#10b981' : '#6b7280' 
        }}>
          {trend}
        </span>
      </div>
      <p style={{ 
        fontSize: '24px', 
        fontWeight: 'bold', 
        color: '#111827',
        margin: 0
      }}>
        {value}
      </p>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      style={{ 
        display: 'block',
        backgroundColor: 'white', 
        padding: '24px', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#111827',
        marginBottom: '8px' 
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '14px', 
        color: '#6b7280',
        margin: 0
      }}>
        {description}
      </p>
    </a>
  );
}