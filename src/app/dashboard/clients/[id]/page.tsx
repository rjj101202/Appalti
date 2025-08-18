'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchClient();
    }
  }, [params.id]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}`);
      const result = await response.json();
      
      if (result.success) {
        setClient(result.data);
      } else {
        setError('Client niet gevonden');
      }
    } catch (err) {
      console.error('Error fetching client:', err);
      setError('Er ging iets mis bij het laden');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteClient = async () => {
    if (!confirm('Weet je zeker dat je dit bedrijf wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    try {
      const res = await fetch(`/api/clients/${params.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verwijderen mislukt');
      router.push('/dashboard/clients');
    } catch (e: any) {
      alert(e.message || 'Verwijderen mislukt');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner-small" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Laden...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !client) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="error-message">
            {error || 'Client niet gevonden'}
          </div>
          <Link href="/dashboard/clients" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Terug naar overzicht
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Header */}
        <div className="header-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <Link href="/dashboard/clients" style={{ color: '#6b7280', textDecoration: 'none' }}>
                  ← Terug
                </Link>
              </div>
              <h1>{client.name}</h1>
              {client.kvkNumber && (
                <p style={{ color: '#6b7280' }}>KVK: {client.kvkNumber}</p>
              )}
            </div>
            <div>
              <button className="btn btn-danger" onClick={deleteClient}>Verwijder Bedrijf</button>
            </div>
          </div>
        </div>

        {/* Company Info Card */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Bedrijfsgegevens</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Algemeen</h4>
              <dl style={{ display: 'grid', gap: '0.5rem' }}>
                {client.legalForm && (
                  <div>
                    <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Rechtsvorm:</dt>
                    <dd>{client.legalForm}</dd>
                  </div>
                )}
                {client.sbiCode && (
                  <div>
                    <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Branche:</dt>
                    <dd>{client.sbiDescription || client.sbiCode}</dd>
                  </div>
                )}
                {client.employees && (
                  <div>
                    <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Medewerkers:</dt>
                    <dd>{client.employees}</dd>
                  </div>
                )}
              </dl>
            </div>
            
            <div>
              <h4 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Contact</h4>
              <dl style={{ display: 'grid', gap: '0.5rem' }}>
                {client.address && (
                  <div>
                    <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Adres:</dt>
                    <dd>
                      {client.address.street}<br />
                      {client.address.postalCode} {client.address.city}
                    </dd>
                  </div>
                )}
                {client.website && (
                  <div>
                    <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Website:</dt>
                    <dd>
                      <a href={client.website} target="_blank" rel="noopener noreferrer" style={{ color: '#9333ea' }}>
                        {client.website}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <h2 style={{ marginBottom: '1rem' }}>Acties</h2>
        <div className="action-grid">
          {/* Teamleden Card */}
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Teamleden</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Bekijk teamleden van dit bedrijf en nodig nieuwe gebruikers uit.
            </p>
            <Link 
              href={`#members`} 
              className="btn btn-secondary"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch(`/api/companies/${params.id}/members`);
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Laden mislukt');
                  alert((data.data || []).map((m: any) => `${m.name || m.email} – ${m.companyRole}`).join('\n') || 'Geen leden gevonden');
                } catch (err: any) {
                  alert(err.message || 'Kon teamleden niet laden');
                }
              }}
            >
              Bekijk Teamleden
            </Link>
            <Link 
              href={`/dashboard/clients/${params.id}/invite`}
              className="btn btn-primary" 
              style={{ marginLeft: '0.5rem' }}
            >
              Nodig gebruiker uit
            </Link>
          </div>
          {/* IKP Card */}
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Ideaal Klant Profiel (IKP)</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Definieer het ideale klantprofiel voor {client.name} om de beste tender matches te vinden.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <span className={`badge ${
                client.ikpStatus === 'completed' ? 'badge-success' : 
                client.ikpStatus === 'in_progress' ? 'badge-warning' : 
                'badge-info'
              }`}>
                {client.ikpStatus === 'completed' ? 'Compleet' :
                 client.ikpStatus === 'in_progress' ? `In Progress (${client.ikpCompletedSteps || 0}/15)` :
                 'Niet Gestart'}
              </span>
            </div>
            <Link 
              href={`/dashboard/clients/${params.id}/ikp`} 
              className="btn btn-primary"
            >
              {client.ikpStatus === 'not_started' ? 'Start IKP' : 
               client.ikpStatus === 'in_progress' ? 'Verder met IKP' : 
               'Bekijk IKP'}
            </Link>
          </div>

          {/* Company Details Card */}
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Bedrijfsgegevens</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Beheer en update de bedrijfsgegevens en contactinformatie.
            </p>
            <Link 
              href={`/dashboard/clients/${params.id}/edit`} 
              className="btn btn-secondary"
            >
              Bewerk Gegevens
            </Link>
          </div>

          {/* Bid Process Card */}
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Bid Proces</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Bekijk actieve bids en tender processen voor dit bedrijf.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                0 actieve bids
              </span>
            </div>
            <Link 
              href={`/dashboard/clients/${params.id}/bids`} 
              className="btn btn-secondary"
            >
              Bekijk Bids
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}