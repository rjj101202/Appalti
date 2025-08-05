'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import IKPForm from '@/components/ikp/IKPForm';
import { IKPData } from '@/types/ikp';

export default function IKPPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [params.id]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      const data = await response.json();
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      alert('Error loading client data');
      router.push('/dashboard/clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (ikpData: IKPData) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/clients/${params.id}/ikp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ikpData),
      });

      if (!response.ok) throw new Error('Failed to save IKP data');

      alert('IKP data saved successfully!');
      router.push(`/dashboard/clients/${params.id}`);
    } catch (error) {
      console.error('Error saving IKP:', error);
      alert('Error saving IKP data');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to leave? Any unsaved changes will be lost.')) {
      router.push(`/dashboard/clients/${params.id}`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading client data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Ideaal Klant Profiel (IKP)</h1>
        <p className="text-muted">
          {client?.name} - {client?.kvkNumber}
        </p>
      </div>

      <div className="card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <IKPForm
          initialData={client?.ikpData}
          clientCompanyId={params.id}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>

      {saving && (
        <div className="saving-overlay">
          <div className="saving-content">
            <div className="loading-spinner"></div>
            <p>Saving IKP data...</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}