'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import FeedbackWidget from '@/components/FeedbackWidget';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', key: 'dashboard' },
  { name: 'Client Companies', href: '/dashboard/clients', key: 'clients' },
  { name: 'Bids', href: '/dashboard/bids', key: 'bids' },
  { name: 'Team', href: '/dashboard/team', key: 'team' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const displayName = session?.user?.name || session?.user?.email || 'User';
  const displayEmail = session?.user?.email || '';
  const initial = (displayName?.charAt(0) || 'U').toUpperCase();
  const userAvatar = (session?.user as any)?.image;

  return (
    <div className="dashboard-container">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'block',
          }}
          onClick={() => setSidebarOpen(false)}
          className="mobile-only"
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/dashboard" className="logo">
            <span>Appalti</span> AI
          </Link>
          <button
            className="mobile-only"
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigation
            .filter((item) => {
              // Verberg 'Client Companies' voor niet-Appalti gebruikers als er geen beheertaken zijn
              if (item.key === 'clients' && !(session?.user as any)?.isAppaltiUser) {
                return true; // tonen blijft gewenst als entrypoint naar eigen bedrijf
              }
              return true;
            })
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  {item.name}
                </Link>
              );
            })}
        </nav>

        {/* Bottom section */}
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem', marginTop: 'auto', background: '#fff' }}>
          <Link href="/dashboard/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: userAvatar ? 'transparent' : '#8b1c6d',
                backgroundImage: userAvatar ? `url(${userAvatar})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '500',
                overflow: 'hidden'
              }}>
                {!userAvatar && initial}
              </div>
              <div style={{ marginLeft: '12px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  {displayName}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                  {displayEmail}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Mijn profiel ›</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}
          >
            ☰
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a href="/api/auth/signout" className="btn btn-secondary">
              Logout
            </a>
            <a href="/" className="btn btn-secondary">
              Terug naar Home
            </a>
          </div>
        </header>

        {/* Page content */}
        <main className="content">
          {children}
        </main>
      </div>

      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
}