'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useSession } from 'next-auth/react';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: session } = useSession();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const result = await response.json();
      
      if (result.success) {
        setClients(result.data);
      } else {
        setError('Failed to load clients');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const getIKPStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'in_progress':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  };

  const getIKPStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Compleet';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Niet Gestart';
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="header-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Client Companies</h1>
              <p>Beheer uw klantbedrijven en hun profielen</p>
            </div>
            {/* Verberg aanmaken-knop voor niet-Appalti gebruikers en niet-admins */}
            {session?.user?.isAppaltiUser && (
              <Link href="/dashboard/clients/new" className="btn btn-primary">
                + Nieuwe Client
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner-small" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Laden...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <h3>Nog geen client companies</h3>
            <p>Er is nog geen bedrijf geconfigureerd.</p>
            {session?.user?.isAppaltiUser && (
              <Link href="/dashboard/clients/new" className="btn btn-primary">
                Eerste Client Toevoegen
              </Link>
            )}
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Bedrijfsnaam</th>
                  <th>KVK Nummer</th>
                  <th>IKP Status</th>
                  <th>Branche</th>
                  <th>Toegevoegd</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client._id}>
                    <td>
                      <Link 
                        href={`/dashboard/clients/${client._id}`} 
                        style={{ color: '#8b1c6d', textDecoration: 'none', fontWeight: '500' }}
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td>{client.kvkNumber || '-'}</td>
                    <td>
                      <span className={`badge ${getIKPStatusBadge(client.ikpStatus)}`}>
                        {getIKPStatusText(client.ikpStatus)}
                      </span>
                    </td>
                    <td>{client.sbiDescription || '-'}</td>
                    <td>{new Date(client.createdAt).toLocaleDateString('nl-NL')}</td>
                    <td>
                      <Link 
                        href={`/dashboard/clients/${client._id}`} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.75rem' }}
                      >
                        Bekijk
                      </Link>
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