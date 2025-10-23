'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

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

        <div className="card" style={{ marginTop: '1rem', paddingBottom: '5rem' }}>
          {message && <div className="success-message" style={{ marginBottom: '1rem' }}>{message}</div>}
          {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* Bedrijfsgegevens formulier */}
          <h2 style={{ margin: '0 0 1rem 0' }}>Algemeen</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Naam</label>
              <input className="form-input" value={form.name || ''} onChange={e => updateField('name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">KVK Nummer</label>
              <input className="form-input" value={form.kvkNumber || ''} onChange={e => updateField('kvkNumber', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website || ''} onChange={e => updateField('website', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Websites (komma‑gescheiden)</label>
              <input className="form-input" defaultValue={websitesText} onBlur={e => updateField('websites', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            </div>
            <div>
              <label className="form-label">Handelsnamen (komma‑gescheiden)</label>
              <input className="form-input" defaultValue={handelsText} onBlur={e => updateField('handelsnamen', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            </div>
            <div>
              <label className="form-label">SBI Code</label>
              <input className="form-input" value={form.sbiCode || ''} onChange={e => updateField('sbiCode', e.target.value)} />
            </div>
            <div>
              <label className="form-label">SBI Omschrijving</label>
              <input className="form-input" value={form.sbiDescription || ''} onChange={e => updateField('sbiDescription', e.target.value)} />
            </div>
          </div>

          <h3 style={{ marginTop: '1.5rem' }}>Primair Adres</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Straat</label>
              <input className="form-input" value={form.address?.street || ''} onChange={e => updateField('address.street', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Postcode</label>
              <input className="form-input" value={form.address?.postalCode || ''} onChange={e => updateField('address.postalCode', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Plaats</label>
              <input className="form-input" value={form.address?.city || ''} onChange={e => updateField('address.city', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Land</label>
              <input className="form-input" value={form.address?.country || 'NL'} onChange={e => updateField('address.country', e.target.value)} />
            </div>
          </div>

          {/* Documenten sectie */}
          <h3 style={{ marginTop: '2rem' }}>Documenten</h3>
          <p className="text-gray-600" style={{ margin: '0 0 0.75rem 0' }}>Upload documenten (pdf, docx, txt, md, html). Deze worden geïndexeerd voor AI en zoeken. Binaire bestanden worden niet opgeslagen.</p>
          <div
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleDrop}
            style={{
              border: '2px dashed #c084fc', background: '#faf5ff', borderRadius: 12, padding: '1rem',
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

          {/* Zoeken in documenten */}
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

          {/* Documentlijst */}
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
                        <button className="btn btn-secondary" onClick={() => deleteDoc(d.id)}>Verwijder</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sticky action bar */}
          <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #eee',
            padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem'
          }}>
            <button className="btn btn-secondary" onClick={reEnrich} disabled={saving || !form.kvkNumber}>Verrijk via KVK</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
          </div>
        </div>

        {/* Teamleden sectie */}
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Teamleden</h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Bekijk teamleden en nodig nieuwe gebruikers uit voor dit bedrijf.</p>
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
                const email = prompt('E‑mail adres van de uit te nodigen gebruiker');
                if (!email) return;
                const role = prompt('Rol (owner/admin/member/viewer)', 'member') || 'member';
                try {
                  const res = await fetch(`/api/clients/${params.id}/invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, role })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Uitnodigen mislukt');
                  alert(`Uitnodiging aangemaakt. Token (tijdelijk): ${data.inviteToken}`);
                } catch (e: any) {
                  alert(e?.message || 'Uitnodigen mislukt');
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
      </div>
    </DashboardLayout>
  );
}