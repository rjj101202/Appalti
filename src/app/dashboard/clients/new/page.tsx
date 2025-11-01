'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import CompanyAutocomplete from '@/components/kvk/CompanyAutocomplete';
import { useSession } from 'next-auth/react';

export default function NewClientCompany() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [companyData, setCompanyData] = useState({
    name: '',
    kvkNumber: '',
    legalForm: '',
    sbiCode: '',
    sbiDescription: '',
    address: null as any,
    employees: ''
  });

  const handleCompanySearch = async () => {
    if (!companyData.kvkNumber || companyData.kvkNumber.length !== 8) {
      setSearchError('Voer een geldig 8-cijferig KVK nummer in');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const response = await fetch(`/api/kvk/search?kvkNumber=${companyData.kvkNumber}`);
      const result = await response.json();

      if (result.success && result.data) {
        setCompanyData({
          ...companyData,
          ...result.data
        });
      } else {
        setSearchError('Bedrijf niet gevonden in KVK register');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Er ging iets mis bij het zoeken');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCompanySelect = async (company: { name: string; kvkNumber: string }) => {
    setCompanyData({
      ...companyData,
      name: company.name,
      kvkNumber: company.kvkNumber
    });

    setIsSearching(true);
    setSearchError('');

    try {
      const response = await fetch(`/api/kvk/search?kvkNumber=${company.kvkNumber}`);
      const result = await response.json();

      if (result.success && result.data) {
        setCompanyData({
          ...companyData,
          ...result.data
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    if (!companyData.name) {
      setSaveError('Bedrijfsnaam is verplicht');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData)
      });

      const result = await response.json();

      if (result.success) {
        // Navigate to the client detail page
        router.push(`/dashboard/clients/${result.data._id}`);
      } else {
        setSaveError(result.error || 'Er ging iets mis bij het opslaan');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveError('Er ging iets mis bij het opslaan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/clients');
  };

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Verberg/redirect voor niet-Appalti gebruikers */}
        {!session?.user?.isAppaltiUser && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>
            Deze pagina is niet beschikbaar.
          </div>
        )}
        <div className="header-section">
          <h1>Nieuwe Client Company</h1>
          <p>Voeg een nieuw bedrijf toe aan uw portfolio</p>
        </div>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2>Bedrijf toevoegen</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Left column - Search */}
            <div>
              <div className="form-group">
                <label htmlFor="kvkNumber">KVK Nummer</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input
                    type="text"
                    id="kvkNumber"
                    placeholder="12345678"
                    value={companyData.kvkNumber}
                    onChange={(e) => {
                      setCompanyData({ ...companyData, kvkNumber: e.target.value.replace(/\D/g, '').slice(0, 8) });
                      setSearchError('');
                    }}
                    style={{ flex: 1 }}
                  />
                  <button 
                    onClick={handleCompanySearch}
                    className="btn btn-primary"
                    disabled={!companyData.kvkNumber || isSearching}
                  >
                    {isSearching ? 'Zoeken...' : 'Zoek'}
                  </button>
                </div>
                {searchError && (
                  <span className="error-message">{searchError}</span>
                )}
              </div>

              <div style={{ margin: '1.5rem 0', textAlign: 'center', color: '#6b7280' }}>
                — of —
              </div>

              <div className="form-group">
                <label htmlFor="companyName">Bedrijfsnaam</label>
                <CompanyAutocomplete
                  value={companyData.name}
                  onChange={(value) => setCompanyData({ ...companyData, name: value })}
                  onSelect={handleCompanySelect}
                  placeholder="Begin met typen om bedrijven te zoeken..."
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Typ minimaal 2 letters om te zoeken
                </p>
              </div>
            </div>

            {/* Right column - Company info */}
            <div>
              {companyData.name && (
                <div>
                  <h3 style={{ marginBottom: '1rem' }}>Bedrijfsgegevens</h3>
                  <dl style={{ display: 'grid', gap: '0.5rem' }}>
                    <div>
                      <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Naam:</dt>
                      <dd style={{ fontWeight: '500' }}>{companyData.name}</dd>
                    </div>
                    {companyData.kvkNumber && (
                      <div>
                        <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>KVK:</dt>
                        <dd>{companyData.kvkNumber}</dd>
                      </div>
                    )}
                    {companyData.legalForm && (
                      <div>
                        <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Rechtsvorm:</dt>
                        <dd>{companyData.legalForm}</dd>
                      </div>
                    )}
                    {companyData.sbiCode && (
                      <div>
                        <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Branche:</dt>
                        <dd>{companyData.sbiDescription}</dd>
                      </div>
                    )}
                    {companyData.address && (
                      <div>
                        <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Adres:</dt>
                        <dd>
                          {companyData.address.street}<br />
                          {companyData.address.postalCode} {companyData.address.city}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>

          {saveError && (
            <div className="error-message" style={{ marginTop: '1rem' }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
            <button onClick={handleCancel} className="btn btn-secondary">
              Annuleren
            </button>
            <button 
              onClick={handleSave}
              className="btn btn-primary"
              disabled={!companyData.name || isSaving}
              style={{ marginLeft: 'auto' }}
            >
              {isSaving ? 'Opslaan...' : 'Bedrijf Toevoegen'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}