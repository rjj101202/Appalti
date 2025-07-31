'use client';

import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welkom bij Appalti AI
          </h1>
          <p className="text-purple-100">
            Beheer uw aanbestedingen en optimaliseer uw sales proces met AI
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-gray-500'}`}>
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
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
      className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all group"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600">
        {title}
      </h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}