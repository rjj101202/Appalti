'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import CPVCodeSelector from '@/components/CPVCodeSelector';

export default function ClientEditPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<Array<any>>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Relevante Tenders
  const [relevantTenders, setRelevantTenders] = useState<Array<any>>([]);
  const [loadingTenders, setLoadingTenders] = useState(false);
  const [tendersError, setTendersError] = useState('');
  
  // Accordion state - standaard allemaal dicht voor professionele look
  const [openSections, setOpenSections] = useState({
    bedrijfsgegevens: false,
    cpvCodes: false,
    relevanteTenders: false,
    teamleden: false,
    documenten: false
  });
  
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    
    // Als relevante tenders wordt geopend en nog niet geladen, laad ze
    if (section === 'relevanteTenders' && !openSections.relevanteTenders && relevantTenders.length === 0) {
      loadRelevantTenders();
    }
  };
  
  const loadRelevantTenders = async () => {
    setLoadingTenders(true);
    setTendersError('');
    try {
      const cpvCodes = form.cpvCodes || [];
      
      if (cpvCodes.length === 0) {
        setTendersError('Selecteer eerst CPV codes om relevante tenders te vinden');
        setLoadingTenders(false);
        return;
      }
      
      // Zoek tenders met deze CPV codes
      const params = new URLSearchParams();
      params.set('cpv', cpvCodes.join(','));
      params.set('size', '20');
      
      const res = await fetch(`/api/bids/sources/tenderned?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Laden mislukt');
      }
      
      setRelevantTenders(data.items || []);
    } catch (e: any) {
      setTendersError(e?.message || 'Kon tenders niet laden');
    } finally {
      setLoadingTenders(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetch(`/api/clients/${params.id}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            setClient(res.data);
            setForm({
              name: res.data.name || '',
              kvkNumber: res.data.kvkNumber || '',
              legalForm: res.data.legalForm || '',
              website: res.data.website || '',
              websites: res.data.websites || [],
              handelsnamen: res.data.handelsnamen || [],
              sbiCode: res.data.sbiCode || '',
              sbiDescription: res.data.sbiDescription || '',
              cpvCodes: res.data.cpvCodes || [],
              emailDomain: res.data.emailDomain || '',
              address: res.data.address || { street: '', postalCode: '', city: '', country: 'NL' },
              addresses: res.data.addresses || []
            });
            refreshDocs();
          } else {
            setError('Client niet gevonden');
          }
        })
        .catch(() => setError('Laden mislukt'));
    }
  }, [params.id]);

  const updateField = (path: string, value: any) => {
    setForm((prev: any) => {
      const next = { ...prev };
      const keys = path.split('.');
      let ref = next;
      for (let i = 0; i < keys.length - 1; i++) {
        ref[keys[i]] = ref[keys[i]] ?? {};
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const refreshDocs = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}/knowledge/list`);
      const data = await res.json();
      if (res.ok && data.success) setDocs(data.data.items || []);
    } catch {}
  };

  const onFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      const res = await fetch(`/api/clients/${params.id}/knowledge/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload mislukt');
      setMessage(`Geüpload: ${data.data.uploaded} bestand(en)`);
      await refreshDocs();
    } catch (e: any) {
      setError(e?.message || 'Upload mislukt');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    onFilesChosen(files || null);
  };

  const doSearch = async () => {
    setSearchResults([]);
    if (!searchQ.trim()) return;
    try {
      const url = new URL('/api/knowledge/search', window.location.origin);
      url.searchParams.set('q', searchQ);
      url.searchParams.set('scope', 'vertical');
      url.searchParams.set('companyId', String(params.id));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok && data.success) setSearchResults(data.data.results || []);
    } catch {}
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm('Weet je zeker dat je dit document wilt verwijderen? Dit verwijdert ook alle indexering.')) return;
    try {
      const res = await fetch(`/api/clients/${params.id}/knowledge/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verwijderen mislukt');
      await refreshDocs();
    } catch (e: any) {
      alert(e?.message || 'Verwijderen mislukt');
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt');
      setMessage('Opgeslagen');
      router.refresh?.();
    } catch (e: any) {
      setError(e.message || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const reEnrich = async () => {
    if (!form.kvkNumber) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      // Vraag full profile op en merge in formulier
      const res = await fetch(`/api/kvk/search?kvkNumber=${encodeURIComponent(form.kvkNumber)}&full=true`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Verrijken mislukt');
      const agg = data.data;
      setForm((prev: any) => ({
        ...prev,
        name: prev.name || agg.name || agg.statutaireNaam,
        address: agg.adressen?.[0] ? {
          street: `${agg.adressen[0].straat || ''} ${agg.adressen[0].huisnummer || ''}`.trim(),
          postalCode: agg.adressen[0].postcode || '',
          city: agg.adressen[0].plaats || '',
          country: 'NL'
        } : prev.address,
        addresses: agg.adressen || prev.addresses,
        websites: agg.websites || prev.websites,
        handelsnamen: agg.handelsnamen || prev.handelsnamen,
        sbiCode: agg.sbiActiviteiten?.find((s: any) => s.hoofd)?.sbiCode || prev.sbiCode,
        sbiDescription: agg.sbiActiviteiten?.find((s: any) => s.hoofd)?.omschrijving || prev.sbiDescription
      }));
      setMessage('Gegevens verrijkt via KVK');
    } catch (e: any) {
      setError(e.message || 'Verrijken mislukt');
    } finally {
      setSaving(false);
    }
  };

  if (!client) {
    return (
      <DashboardLayout>
        <div className="page-container">{error || 'Laden...'}</div>
      </DashboardLayout>
    );
  }

  const websitesText = (form.websites || []).join(', ');
  const handelsText = (form.handelsnamen || []).join(', ');

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Header met terugknop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => { try { router.back(); } catch { router.push(`/dashboard/clients/${params.id}` as any); } }}>← Terug</button>
          <h1 style={{ margin: 0 }}>Bedrijfsgegevens bewerken</h1>
        </div>

        {/* Messages */}
        {message && <div className="success-message" style={{ marginTop: '1rem' }}>{message}</div>}
        {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}

        {/* Accordion Sectie 1: Bedrijfsgegevens */}
        <div className="card" style={{ marginTop: '1rem' }}>
          <div 
            onClick={() => toggleSection('bedrijfsgegevens')}
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: openSections.bedrijfsgegevens ? '2px solid #f3e8ff' : 'none',
              marginBottom: openSections.bedrijfsgegevens ? '1rem' : 0
            }}
          >
            <h2 style={{ margin: 0, color: '#701c74', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Algemene Bedrijfsgegevens
            </h2>
            <span style={{ fontSize: '1.5em', color: '#701c74', transition: 'transform 0.2s', transform: openSections.bedrijfsgegevens ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {openSections.bedrijfsgegevens && (
            <div>
          <div className="form-grid">
            <div className="form-item">
              <label className="form-label" style={{ whiteSpace: 'nowrap' }}>Naam</label>
              <input className="form-input" value={form.name || ''} onChange={e => updateField('name', e.target.value)} />
            </div>
            <div className="form-item">
              <label className="form-label" style={{ whiteSpace: 'nowrap' }}>KVK Nummer</label>
              <input className="form-input" value={form.kvkNumber || ''} onChange={e => updateField('kvkNumber', e.target.value)} />
            </div>
            <div className="form-item">
              <label className="form-label">Website</label>
              <input className="form-input" placeholder="https://..." value={form.website || ''} onChange={e => updateField('website', e.target.value)} />
            </div>
            <div className="form-item">
              <label className="form-label">Websites (komma‑gescheiden)</label>
              <input className="form-input" placeholder="example.com, sub.example.com" value={websitesText} onChange={e => updateField('websites', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            </div>
            <div className="form-item">
              <label className="form-label">Handelsnamen (komma‑gescheiden)</label>
              <input className="form-input" value={handelsText} onChange={e => updateField('handelsnamen', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            </div>
            <div className="form-item">
              <label className="form-label">SBI Code</label>
              <input className="form-input" value={form.sbiCode || ''} onChange={e => updateField('sbiCode', e.target.value)} />
            </div>
            <div className="form-item" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">SBI Omschrijving</label>
              <input className="form-input" value={form.sbiDescription || ''} onChange={e => updateField('sbiDescription', e.target.value)} />
            </div>
          </div>

          <h3 style={{ marginTop: '1.5rem' }}>Primair Adres</h3>
          <div className="form-grid address-grid">
            <div className="form-item">
              <label className="form-label">Straat</label>
              <input className="form-input" value={form.address?.street || ''} onChange={e => updateField('address.street', e.target.value)} />
            </div>
            <div className="form-item">
              <label className="form-label">Postcode</label>
              <input className="form-input" value={form.address?.postalCode || ''} onChange={e => updateField('address.postalCode', e.target.value)} />
            </div>
            <div className="form-item">
              <label className="form-label">Plaats</label>
              <input className="form-input" value={form.address?.city || ''} onChange={e => updateField('address.city', e.target.value)} />
            </div>
            <div className="form-item">
              <label className="form-label">Land</label>
              <input className="form-input" value={form.address?.country || 'NL'} onChange={e => updateField('address.country', e.target.value)} />
            </div>
          </div>

          {/* Sticky action bar voor bedrijfsgegevens */}
          <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #eee',
            padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem'
          }}>
            <button className="btn btn-secondary" onClick={reEnrich} disabled={saving || !form.kvkNumber}>Verrijk via KVK</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
          </div>
            </div>
          )}
        </div>

        {/* Accordion Sectie 2: CPV Codes */}
        <div className="card" style={{ marginTop: '1rem' }}>
          <div 
            onClick={() => toggleSection('cpvCodes')}
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: openSections.cpvCodes ? '2px solid #f3e8ff' : 'none',
              marginBottom: openSections.cpvCodes ? '1rem' : 0
            }}
          >
            <h2 style={{ margin: 0, color: '#701c74', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              CPV Codes (Aanbestedingscategorieën)
              {(form.cpvCodes || []).length > 0 && (
                <span style={{ 
                  fontSize: '0.7em', 
                  backgroundColor: '#f3e8ff', 
                  color: '#701c74', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '12px',
                  fontWeight: 600
                }}>
                  {form.cpvCodes.length}
                </span>
              )}
            </h2>
            <span style={{ fontSize: '1.5em', color: '#701c74', transition: 'transform 0.2s', transform: openSections.cpvCodes ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {openSections.cpvCodes && (
            <div>
              <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.9em' }}>
                Selecteer de CPV codes die van toepassing zijn op dit bedrijf. Dit helpt bij het matchen met relevante aanbestedingen.
              </p>
              
              <div className="form-item">
                <label className="form-label" style={{ fontWeight: 600 }}>Geselecteerde CPV Codes</label>
                <CPVCodeSelector 
                  selectedCodes={form.cpvCodes || []} 
                  onChange={(codes) => updateField('cpvCodes', codes)} 
                />
                
                {(form.cpvCodes || []).length > 0 && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85em', color: '#581c87', background: '#f3e8ff', padding: '0.75rem', borderRadius: '6px' }}>
                    <strong>Tip:</strong> Deze codes worden gebruikt om automatisch passende TenderNed aanbestedingen te vinden voor dit bedrijf.
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #eee' }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
              </div>
            </div>
          )}
        </div>

        {/* Accordion Sectie 3: Relevante Tenders */}
        <div className="card" style={{ marginTop: '1rem' }}>
          <div 
            onClick={() => toggleSection('relevanteTenders')}
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: openSections.relevanteTenders ? '2px solid #f3e8ff' : 'none',
              marginBottom: openSections.relevanteTenders ? '1rem' : 0
            }}
          >
            <h2 style={{ margin: 0, color: '#701c74', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Relevante Tenders
              {relevantTenders.length > 0 && (
                <span style={{ 
                  fontSize: '0.7em', 
                  backgroundColor: '#f3e8ff', 
                  color: '#701c74', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '12px',
                  fontWeight: 600
                }}>
                  {relevantTenders.length}
                </span>
              )}
            </h2>
            <span style={{ fontSize: '1.5em', color: '#701c74', transition: 'transform 0.2s', transform: openSections.relevanteTenders ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {openSections.relevanteTenders && (
            <div>
              <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9em' }}>
                Tenders die matchen met de CPV codes van dit bedrijf. Later wordt dit uitgebreid met IKP matching.
              </p>
              
              {loadingTenders && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner-small" style={{ margin: '0 auto' }}></div>
                  <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.9em' }}>Tenders laden...</p>
                </div>
              )}
              
              {tendersError && (
                <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
                  {tendersError}
                </div>
              )}
              
              {!loadingTenders && !tendersError && relevantTenders.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f9fafb', borderRadius: '6px', border: '1px dashed #d1d5db' }}>
                  <p style={{ margin: 0, color: '#6b7280' }}>Geen tenders gevonden.</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85em', color: '#9ca3af' }}>
                    Voeg CPV codes toe en open deze sectie opnieuw.
                  </p>
                </div>
              )}
              
              {relevantTenders.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9em', color: '#6b7280' }}>
                      <strong>{relevantTenders.length}</strong> tenders gevonden op basis van CPV codes
                    </p>
                    <button className="btn btn-secondary" onClick={loadRelevantTenders} disabled={loadingTenders} style={{ fontSize: '0.85em' }}>
                      Ververs
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {relevantTenders.map((tender: any, idx: number) => (
                      <div 
                        key={tender.id || idx}
                        style={{ 
                          padding: '1rem', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          background: '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(112, 28, 116, 0.1)';
                          e.currentTarget.style.borderColor = '#d8b4fe';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                        onClick={() => {
                          // Ga naar interne tender detail pagina met pre-selected client
                          const url = `/dashboard/bids/${encodeURIComponent(tender.id)}?clientId=${encodeURIComponent(params.id as string)}&autoLink=true`;
                          router.push(url);
                        }}
                      >
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#111827', fontSize: '1em' }}>
                          {tender.title}
                        </h4>
                        
                        <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.85em', color: '#6b7280' }}>
                          {tender.buyer && (
                            <div>
                              <strong>Opdrachtgever:</strong> {tender.buyer}
                            </div>
                          )}
                          {tender.submissionDeadline && (
                            <div>
                              <strong>Deadline:</strong> {new Date(tender.submissionDeadline).toLocaleDateString('nl-NL')}
                            </div>
                          )}
                          {tender.cpvCodes && tender.cpvCodes.length > 0 && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <strong>CPV Codes:</strong>{' '}
                              {tender.cpvCodes.slice(0, 3).map((code: string, i: number) => (
                                <span key={i} style={{ 
                                  display: 'inline-block',
                                  backgroundColor: '#f3e8ff', 
                                  color: '#701c74', 
                                  padding: '0.125rem 0.375rem', 
                                  borderRadius: '4px',
                                  fontSize: '0.9em',
                                  marginRight: '0.25rem'
                                }}>
                                  {code}
                                </span>
                              ))}
                              {tender.cpvCodes.length > 3 && (
                                <span style={{ fontSize: '0.9em' }}>+{tender.cpvCodes.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', fontSize: '0.85em', color: '#6b7280' }}>
                    <strong>Toekomstige verbetering:</strong> Matching wordt uitgebreid met IKP scores voor betere relevantie.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion Sectie 4: Teamleden */}
        <div className="card" style={{ marginTop: '1rem' }}>
          <div 
            onClick={() => toggleSection('teamleden')}
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: openSections.teamleden ? '2px solid #f3e8ff' : 'none',
              marginBottom: openSections.teamleden ? '1rem' : 0
            }}
          >
            <h2 style={{ margin: 0, color: '#701c74', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Teamleden
            </h2>
            <span style={{ fontSize: '1.5em', color: '#701c74', transition: 'transform 0.2s', transform: openSections.teamleden ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {openSections.teamleden && (
            <div>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Beheer toegang voor medewerkers van dit bedrijf.</p>
          
          {/* Email Domein Instelling */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Email Domein voor Team Uitnodigingen
            </label>
            <input 
              className="form-input" 
              placeholder="bijv. jagerproducties.nl (zonder @)"
              value={form.emailDomain || ''} 
              onChange={e => updateField('emailDomain', e.target.value.toLowerCase().replace('@', ''))}
              style={{ marginBottom: '0.5rem' }}
            />
            <p style={{ fontSize: '0.85em', color: '#6b7280', margin: 0 }}>
              Alleen gebruikers met dit email domein kunnen worden uitgenodigd voor dit bedrijf.
              {form.emailDomain && (
                <span style={{ display: 'block', marginTop: '0.25rem', color: '#701c74', fontWeight: 500 }}>
                  Toegestaan: *@{form.emailDomain}
                </span>
              )}
            </p>
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={save} disabled={saving} style={{ fontSize: '0.9em' }}>
                {saving ? 'Opslaan...' : 'Domein Opslaan'}
              </button>
            </div>
          </div>
          
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/clients/${params.id}/members`);
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Laden mislukt');
                  const lines = (data.data || []).map((m: any) => `${m.name || m.email} – ${m.companyRole}`);
                  alert(lines.length ? lines.join('\n') : 'Nog geen teamleden');
                } catch (e: any) {
                  alert(e?.message || 'Kon teamleden niet laden');
                }
              }}
            >
              Bekijk Teamleden
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!form.emailDomain) {
                  alert('Stel eerst een email domein in voordat je gebruikers kunt uitnodigen.');
                  return;
                }
                
                const email = prompt(`E-mail adres (moet eindigen op @${form.emailDomain})`);
                if (!email) return;
                
                // Valideer email domein
                const emailDomain = email.toLowerCase().split('@')[1];
                if (emailDomain !== form.emailDomain.toLowerCase()) {
                  alert(`Fout: Email moet eindigen op @${form.emailDomain}\n\nJe probeerde: ${email}\nToegestaan: *@${form.emailDomain}`);
                  return;
                }
                
                const role = prompt('Rol (owner/admin/member/viewer)', 'member') || 'member';
                
                try {
                  const res = await fetch(`/api/clients/${params.id}/invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.toLowerCase(), role })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Uitnodigen mislukt');
                  
                  setMessage(`Uitnodiging verstuurd naar ${email}! De gebruiker ontvangt een email met registratielink.`);
                } catch (e: any) {
                  setError(e?.message || 'Uitnodigen mislukt');
                }
              }}
            >
              Nodig gebruiker uit
            </button>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/clients/${params.id}/provision-company`, { method: 'POST' });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Aanmaken client‑omgeving mislukt');
                  alert('Client‑omgeving is aangemaakt.');
                } catch (e: any) {
                  alert(e?.message || 'Provision mislukt');
                }
              }}
            >
              Client‑omgeving aanmaken
            </button>
          </div>
            </div>
          )}
        </div>

        {/* Accordion Sectie 4: Documenten */}
        <div className="card" style={{ marginTop: '1rem' }}>
          <div 
            onClick={() => toggleSection('documenten')}
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: openSections.documenten ? '2px solid #f3e8ff' : 'none',
              marginBottom: openSections.documenten ? '1rem' : 0
            }}
          >
            <h2 style={{ margin: 0, color: '#701c74', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Documenten
              {docs.length > 0 && (
                <span style={{ 
                  fontSize: '0.7em', 
                  backgroundColor: '#f3e8ff', 
                  color: '#701c74', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '12px',
                  fontWeight: 600
                }}>
                  {docs.length}
                </span>
              )}
            </h2>
            <span style={{ fontSize: '1.5em', color: '#701c74', transition: 'transform 0.2s', transform: openSections.documenten ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {openSections.documenten && (
            <div>
          <p className="text-gray-600" style={{ margin: '0 0 0.75rem 0' }}>Upload documenten (pdf, docx, txt, md, html). Deze worden geïndexeerd voor AI en zoeken. Binaire bestanden worden niet opgeslagen.</p>

          <div
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleDrop}
            style={{
              border: '2px dashed #d8b4fe', background: '#faf5ff', borderRadius: 12, padding: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#581c87' }}>Sleep bestanden hierheen</div>
              <div className="text-gray-600" style={{ fontSize: 12 }}>of kies bestanden via de knop</div>
            </div>
            <div>
              <input ref={fileInputRef} type="file" multiple onChange={(e) => onFilesChosen(e.target.files)} />
              <button className="btn btn-primary" disabled={uploading} onClick={() => fileInputRef.current?.click()} style={{ marginLeft: '0.5rem' }}>{uploading ? 'Uploaden…' : 'Kies bestanden'}</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
            <input className="form-input" placeholder="Zoek in documenten…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            <button className="btn btn-secondary" onClick={doSearch}>Zoek</button>
          </div>
          {searchResults.length > 0 && (
            <div className="card" style={{ marginTop: '0.75rem' }}>
              <h4 style={{ marginTop: 0 }}>Zoekresultaten</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {searchResults.map((r, idx) => (
                  <li key={idx} style={{ padding: '0.5rem 0', borderTop: '1px solid #eee' }}>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Bron: {r.document?.title || r.document?.path || 'document'}</div>
                    <div>{r.text}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card" style={{ marginTop: '1rem' }}>
            <h4 style={{ marginTop: 0 }}>Geüploade documenten</h4>
            {docs.length === 0 ? (
              <div className="text-gray-600">Nog geen documenten geüpload.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Titel</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Type</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Grootte</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Chunks</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td style={{ padding: '0.5rem 0' }}>{d.title}</td>
                      <td style={{ padding: '0.5rem 0' }}>{d.mimeType || '-'}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{typeof d.size === 'number' ? `${Math.round(d.size/1024)} KB` : '-'}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{d.chunkCount}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ marginRight: '0.5rem' }} onClick={async () => {
                          try {
                            const res = await fetch(`/api/clients/${params.id}/knowledge/${d.id}?offset=0&limit=50`);
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Laden mislukt');
                            const text = (data.data.chunks || []).map((c: any) => c.text).join('\n\n');
                            alert(`${d.title}\n\n${text}`);
                          } catch (e: any) {
                            alert(e?.message || 'Kon document niet openen');
                          }
                        }}>Bekijken</button>
                        <button className="btn btn-secondary" onClick={() => deleteDoc(d.id)}>Verwijder</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}