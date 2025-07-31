'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Client Companies', href: '/dashboard/clients' },
  { name: 'Tenders', href: '/dashboard/tenders' },
  { name: 'Bids', href: '/dashboard/bids' },
  { name: 'Team', href: '/dashboard/team' },
  { name: 'Instellingen', href: '/dashboard/settings' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex' }}>
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
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: sidebarOpen ? 0 : '-256px',
          bottom: 0,
          zIndex: 50,
          width: '256px',
          backgroundColor: 'white',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          transition: 'left 0.3s ease',
          ...(window.innerWidth >= 1024 ? {
            position: 'static',
            left: 0,
            boxShadow: '1px 0 0 #e5e7eb',
          } : {})
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            height: '64px', 
            padding: '0 24px', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                <span style={{ color: '#9333ea' }}>Appalti</span> AI
              </h1>
            </Link>
            <button
              style={{
                display: window.innerWidth >= 1024 ? 'none' : 'block',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '16px 12px' }}>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    marginBottom: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isActive ? '#9333ea' : '#374151',
                    backgroundColor: isActive ? '#f3e8ff' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#9333ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '500'
              }}>
                U
              </div>
              <div style={{ marginLeft: '12px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Test User
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                  test@appalti.ai
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        marginLeft: window.innerWidth >= 1024 ? '0' : '0',
        width: '100%'
      }}>
        {/* Header */}
        <header style={{ 
          backgroundColor: 'white', 
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            height: '64px', 
            padding: '0 16px' 
          }}>
            <button
              style={{
                display: window.innerWidth >= 1024 ? 'none' : 'block',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px'
              }}
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>

            <div style={{ flex: 1 }} />

            <a 
              href="/" 
              style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#111827';
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Terug naar Home
            </a>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}