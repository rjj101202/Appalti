'use client';

import { useEffect, useState } from 'react';
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
        <h1>Bedrijfsgegevens bewerken</h1>
        <div className="card" style={{ marginTop: '1rem' }}>
          {message && <div className="success-message" style={{ marginBottom: '1rem' }}>{message}</div>}
          {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

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

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
            <button className="btn btn-secondary" onClick={reEnrich} disabled={saving || !form.kvkNumber}>Verrijk via KVK</button>
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