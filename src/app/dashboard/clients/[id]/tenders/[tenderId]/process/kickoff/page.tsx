'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

interface KickoffData {
  leidraadDocument?: {
    name: string;
    url: string;
    uploadedAt: Date;
  };
  generatedContent?: string;
  generatedAt?: Date;
  extractedData?: {
    trajectNaam?: string;
    klantnaam?: string;
    kickoffDatum?: string;
    inleiding?: string;
    doelAanbesteding?: string;
    waardeAanbesteding?: string;
    contractduur?: string;
    planning?: Array<{ onderwerp: string; datum: string; tijd?: string }>;
    geschiktheidseisen?: string[];
    documentatieBijInschrijving?: string[];
    documentatieBijGunning?: string[];
  };
  status: 'empty' | 'document_uploaded' | 'generating' | 'generated' | 'error';
  error?: string;
}

export default function KickoffPage() {
  const { id: clientId, tenderId } = useParams<{ id: string; tenderId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bidId, setBidId] = useState<string | null>(null);
  
  // Kickoff data
  const [kickoff, setKickoff] = useState<KickoffData>({ status: 'empty' });
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Editable extracted data
  const [editableData, setEditableData] = useState<KickoffData['extractedData']>({});
  const [hasChanges, setHasChanges] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      
      // Get bid ID
      const res = await fetch(`/api/clients/${clientId}/tenders`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Laden mislukt');
      const item = (json.data || []).find((x: any) => x.id === tenderId);
      if (!item?.bid?.id) throw new Error('Bid niet gevonden');
      setBidId(item.bid.id);
      
      // Load kick-off data
      const kickoffRes = await fetch(`/api/bids/${item.bid.id}/kickoff`, { cache: 'no-store' });
      const kickoffJson = await kickoffRes.json();
      if (kickoffRes.ok && kickoffJson.success) {
        setKickoff(kickoffJson.data || { status: 'empty' });
        setEditableData(kickoffJson.data?.extractedData || {});
      }
    } catch (e: any) {
      setError(e?.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clientId, tenderId]);

  // Upload leidraad document
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bidId) return;
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/bids/${bidId}/kickoff/upload`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Upload mislukt');
      }
      
      setKickoff(prev => ({
        ...prev,
        leidraadDocument: {
          name: json.data.name,
          url: json.data.url,
          uploadedAt: new Date()
        },
        status: 'document_uploaded'
      }));
    } catch (err: any) {
      alert(err.message || 'Upload mislukt');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Generate kick-off document
  const handleGenerate = async () => {
    if (!bidId) return;
    
    try {
      setGenerating(true);
      setKickoff(prev => ({ ...prev, status: 'generating' }));
      
      const res = await fetch(`/api/bids/${bidId}/kickoff/generate`, {
        method: 'POST'
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Genereren mislukt');
      }
      
      setKickoff(prev => ({
        ...prev,
        extractedData: json.data.extractedData,
        generatedContent: json.data.generatedContent,
        generatedAt: new Date(),
        status: 'generated'
      }));
      setEditableData(json.data.extractedData || {});
    } catch (err: any) {
      setKickoff(prev => ({ ...prev, status: 'error', error: err.message }));
      alert(err.message || 'Genereren mislukt');
    } finally {
      setGenerating(false);
    }
  };

  // Save changes to extracted data
  const handleSave = async () => {
    if (!bidId) return;
    
    try {
      setSaving(true);
      const res = await fetch(`/api/bids/${bidId}/kickoff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kickoff: {
            ...kickoff,
            extractedData: editableData
          }
        })
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Opslaan mislukt');
      }
      
      setHasChanges(false);
      setKickoff(prev => ({ ...prev, extractedData: editableData }));
    } catch (err: any) {
      alert(err.message || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  // Update editable field
  const updateField = (field: string, value: any) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Update planning item
  const updatePlanningItem = (index: number, field: string, value: string) => {
    const newPlanning = [...(editableData?.planning || [])];
    newPlanning[index] = { ...newPlanning[index], [field]: value };
    updateField('planning', newPlanning);
  };

  // Download as Word document
  const handleDownload = async () => {
    if (!bidId) return;
    
    try {
      const res = await fetch(`/api/bids/${bidId}/kickoff/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: editableData })
      });
      
      if (!res.ok) throw new Error('Export mislukt');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kickoff-${editableData?.trajectNaam || 'document'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export mislukt');
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container" style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => router.push(`/dashboard/clients/${clientId}/tenders/${tenderId}/process`)}
          >
            ← Terug
          </button>
          <h1 style={{ margin: 0 }}>📋 Kick-Off Document</h1>
        </div>
        
        {loading && <p>Laden...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left column: Upload & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Upload section */}
              <div className="card">
                <h3 style={{ marginBottom: '0.75rem' }}>1. Aanbestedingsleidraad uploaden</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Upload het aanbestedingsdocument (PDF of Word) om automatisch de belangrijke gegevens te extraheren.
                </p>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleUpload}
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                />
                
                {kickoff.leidraadDocument && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '0.75rem'
                  }}>
                    <span>📄</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {kickoff.leidraadDocument.name}
                    </span>
                    <a 
                      href={kickoff.leidraadDocument.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      Openen
                    </a>
                  </div>
                )}
                
                <button 
                  className="btn btn-secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploaden...' : (kickoff.leidraadDocument ? 'Ander document uploaden' : 'Document uploaden')}
                </button>
              </div>

              {/* Generate section */}
              <div className="card">
                <h3 style={{ marginBottom: '0.75rem' }}>2. Gegevens extraheren</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Laat de AI automatisch de belangrijke data uit het document halen.
                </p>
                
                <button 
                  className="btn"
                  onClick={handleGenerate}
                  disabled={!kickoff.leidraadDocument || generating}
                  style={{ 
                    background: kickoff.leidraadDocument ? '#7c3aed' : '#d1d5db',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  {generating ? 'Bezig met extraheren...' : (kickoff.status === 'generated' ? 'Opnieuw extraheren' : 'Gegevens extraheren')}
                </button>
                
                {kickoff.status === 'generated' && (
                  <p style={{ color: '#059669', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    ✓ Gegevens succesvol geëxtraheerd
                  </p>
                )}
              </div>

              {/* Export section */}
              {kickoff.status === 'generated' && (
                <div className="card">
                  <h3 style={{ marginBottom: '0.75rem' }}>3. Exporteren</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Download het kick-off document als Word bestand.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn"
                      onClick={handleDownload}
                      style={{ background: '#2563eb', color: 'white', border: 'none' }}
                    >
                      📥 Download als Word
                    </button>
                    {hasChanges && (
                      <button 
                        className="btn btn-secondary"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right column: Extracted data (editable) */}
            <div className="card" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Geëxtraheerde gegevens</h3>
                {hasChanges && (
                  <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>● Niet opgeslagen wijzigingen</span>
                )}
              </div>
              
              {kickoff.status === 'generated' || Object.keys(editableData || {}).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Basic info */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      Naam traject
                    </label>
                    <input 
                      type="text"
                      value={editableData?.trajectNaam || ''}
                      onChange={(e) => updateField('trajectNaam', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      Klantnaam
                    </label>
                    <input 
                      type="text"
                      value={editableData?.klantnaam || ''}
                      onChange={(e) => updateField('klantnaam', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      Kick-off datum
                    </label>
                    <input 
                      type="text"
                      value={editableData?.kickoffDatum || ''}
                      onChange={(e) => updateField('kickoffDatum', e.target.value)}
                      placeholder="DD-MM-YYYY"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      Inleiding / Beschrijving opdracht
                    </label>
                    <textarea 
                      value={editableData?.inleiding || ''}
                      onChange={(e) => updateField('inleiding', e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px', resize: 'vertical' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      Doel van de aanbesteding
                    </label>
                    <textarea 
                      value={editableData?.doelAanbesteding || ''}
                      onChange={(e) => updateField('doelAanbesteding', e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px', resize: 'vertical' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      Waarde / Omvang aanbesteding
                    </label>
                    <textarea 
                      value={editableData?.waardeAanbesteding || ''}
                      onChange={(e) => updateField('waardeAanbesteding', e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px', resize: 'vertical' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      Contractduur
                    </label>
                    <input 
                      type="text"
                      value={editableData?.contractduur || ''}
                      onChange={(e) => updateField('contractduur', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    />
                  </div>
                  
                  {/* Planning table */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>
                      Planning
                    </label>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Onderwerp</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '120px' }}>Datum</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '80px' }}>Tijd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(editableData?.planning || []).map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '0.25rem', borderBottom: '1px solid #f3f4f6' }}>
                              <input 
                                type="text"
                                value={item.onderwerp}
                                onChange={(e) => updatePlanningItem(idx, 'onderwerp', e.target.value)}
                                style={{ width: '100%', padding: '0.25rem', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.875rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.25rem', borderBottom: '1px solid #f3f4f6' }}>
                              <input 
                                type="text"
                                value={item.datum}
                                onChange={(e) => updatePlanningItem(idx, 'datum', e.target.value)}
                                style={{ width: '100%', padding: '0.25rem', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.875rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.25rem', borderBottom: '1px solid #f3f4f6' }}>
                              <input 
                                type="text"
                                value={item.tijd || ''}
                                onChange={(e) => updatePlanningItem(idx, 'tijd', e.target.value)}
                                style={{ width: '100%', padding: '0.25rem', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.875rem' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Geschiktheidseisen */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      Geschiktheidseisen (één per regel)
                    </label>
                    <textarea 
                      value={(editableData?.geschiktheidseisen || []).join('\n')}
                      onChange={(e) => updateField('geschiktheidseisen', e.target.value.split('\n').filter(Boolean))}
                      rows={4}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <p style={{ marginBottom: '0.5rem' }}>Nog geen gegevens geëxtraheerd</p>
                  <p style={{ fontSize: '0.875rem' }}>Upload eerst een document en klik op &quot;Gegevens extraheren&quot;</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

