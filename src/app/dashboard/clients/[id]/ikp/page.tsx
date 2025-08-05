'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import IKPForm from '@/components/ikp/IKPForm';
import { IKPData } from '@/types/ikp';

export default function IKPPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleSaveIKP = async (ikpData: IKPData) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/clients/${params.id}/ikp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ikpData),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect back to client detail page
        router.push(`/dashboard/clients/${params.id}`);
      } else {
        setError('Er ging iets mis bij het opslaan');
      }
    } catch (err) {
      console.error('Error saving IKP:', err);
      setError('Er ging iets mis bij het opslaan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/clients/${params.id}`);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Link href={`/dashboard/clients/${params.id}`} style={{ color: '#6b7280', textDecoration: 'none' }}>
              ← Terug naar {client.name}
            </Link>
          </div>
          <h1>Ideaal Klant Profiel (IKP)</h1>
          <p style={{ color: '#6b7280' }}>
            Definieer het ideale klantprofiel voor {client.name} om de beste tender matches te vinden.
          </p>
        </div>

        {/* IKP Form */}
        <div className="card">
          {isSaving && (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(255, 255, 255, 0.8)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 10 
            }}>
              <div className="spinner"></div>
            </div>
          )}
          
          <IKPForm
            initialData={client.ikpData}
            clientCompanyId={params.id as string}
            onSave={handleSaveIKP}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}