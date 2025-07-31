'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import IKPForm from '@/components/ikp/IKPForm';
import CompanyAutocomplete from '@/components/kvk/CompanyAutocomplete';
import { IKPData } from '@/types/ikp';

export default function NewClientCompany() {
  const router = useRouter();
  const [showIKPForm, setShowIKPForm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
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
        setShowIKPForm(true);
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
    // Update company data with selected values
    setCompanyData({
      ...companyData,
      name: company.name,
      kvkNumber: company.kvkNumber
    });

    // Automatically fetch full company details
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
        setShowIKPForm(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Er ging iets mis bij het ophalen van bedrijfsgegevens');
    } finally {
      setIsSearching(false);
    }
  };

  const handleIKPSave = async (ikpData: IKPData) => {
    // TODO: Save to database
    console.log('Saving IKP data:', ikpData);
    
    // Navigate back to clients list
    router.push('/dashboard/clients');
  };

  const handleCancel = () => {
    router.push('/dashboard/clients');
  };

  if (showIKPForm) {
    return (
      <DashboardLayout>
        <div>
          <div className="header-section">
            <h1>Nieuw Klantprofiel: {companyData.name}</h1>
            <p>Vul het Ideaal Klant Profiel (IKP) in voor optimale tender matching</p>
          </div>

          {/* Company info summary */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Bedrijfsgegevens uit KVK</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <strong>Bedrijfsnaam:</strong> {companyData.name}
              </div>
              <div>
                <strong>KVK nummer:</strong> {companyData.kvkNumber}
              </div>
              {companyData.legalForm && (
                <div>
                  <strong>Rechtsvorm:</strong> {companyData.legalForm}
                </div>
              )}
              {companyData.sbiCode && (
                <div>
                  <strong>SBI Code:</strong> {companyData.sbiCode} - {companyData.sbiDescription}
                </div>
              )}
              {companyData.address && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Adres:</strong> {companyData.address.street}, {companyData.address.postalCode} {companyData.address.city}
                </div>
              )}
            </div>
          </div>

          <IKPForm
            initialData={{
              personalDetails: {
                companyName: companyData.name,
                kvkNumber: companyData.kvkNumber
              },
              industry: companyData.sbiCode ? {
                primary: companyData.sbiDescription || '',
                sbicodes: [companyData.sbiCode]
              } : undefined,
              organizationSize: companyData.employees ? {
                employees: parseInt(companyData.employees.split('-')[0]) || 0
              } : undefined
            }}
            onSave={handleIKPSave}
            onCancel={handleCancel}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="header-section">
          <h1>Nieuwe Client Company</h1>
          <p>Zoek een bedrijf via KVK nummer of bedrijfsnaam</p>
        </div>

        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>Bedrijf toevoegen</h2>
          
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
                {isSearching ? 'Zoeken...' : 'Zoek in KVK'}
              </button>
            </div>
            {searchError && (
              <span className="error-message">{searchError}</span>
            )}
          </div>

          <div style={{ margin: '2rem 0', textAlign: 'center', color: '#6b7280' }}>
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
              Typ minimaal 2 letters om te zoeken in het KVK register
            </p>
          </div>

          {isSearching && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div className="spinner-small" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>Bedrijfsgegevens ophalen...</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button onClick={handleCancel} className="btn btn-secondary">
              Annuleren
            </button>
            <button 
              onClick={() => setShowIKPForm(true)}
              className="btn btn-primary"
              disabled={!companyData.name && !companyData.kvkNumber}
              style={{ marginLeft: 'auto' }}
            >
              Volgende: IKP Invullen
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}