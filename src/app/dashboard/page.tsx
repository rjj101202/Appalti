'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Building2, FileText, TrendingUp, Users } from 'lucide-react';

export default function Dashboard() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welkom terug, {user.name || user.email}!
          </h1>
          <p className="text-primary-100">
            Beheer uw aanbestedingen en optimaliseer uw sales proces met AI
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Building2 className="h-6 w-6" />}
            title="Client Companies"
            value="0"
            trend="+0%"
            trendUp={true}
          />
          <StatCard
            icon={<FileText className="h-6 w-6" />}
            title="Actieve Tenders"
            value="0"
            trend="+0%"
            trendUp={true}
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="Win Rate"
            value="0%"
            trend="+0%"
            trendUp={true}
          />
          <StatCard
            icon={<Users className="h-6 w-6" />}
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
            icon={<Building2 className="h-8 w-8" />}
          />
          <QuickActionCard
            title="Tender Matching"
            description="Bekijk nieuwe tender matches voor uw clients"
            href="/dashboard/tenders"
            icon={<FileText className="h-8 w-8" />}
          />
          <QuickActionCard
            title="Team Beheer"
            description="Nodig teamleden uit en beheer rollen"
            href="/dashboard/team"
            icon={<Users className="h-8 w-8" />}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ 
  icon, 
  title, 
  value, 
  trend, 
  trendUp 
}: { 
  icon: React.ReactNode;
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
          {icon}
        </div>
        <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-gray-500'}`}>
          {trend}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="card-elevated p-6 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </a>
  );
}