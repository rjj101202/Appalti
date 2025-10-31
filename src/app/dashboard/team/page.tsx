'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: '', contactEmail: '', contactPhone: '', description: '' });

  const canManage = session?.companyRole === 'admin' || session?.companyRole === 'owner' || (session as any)?.user?.isAppaltiUser;

  useEffect(() => {
    (async () => {
      try {
        // Load members
        const res = await fetch('/api/companies/active/members');
        if (res.status === 404) {
          // fallback naar route die actieve company gebruikt, met dummy id
          const res2 = await fetch('/api/companies/_/members');
          const data2 = await res2.json();
          if (res2.ok && data2.success) setMembers(data2.data);
          else setError(data2.error || 'Laden mislukt');
        } else {
          const data = await res.json();
          if (res.ok && data.success) setMembers(data.data);
          else setError(data.error || 'Laden mislukt');
        }
        
        // Load company info
        try {
          const companyRes = await fetch('/api/auth/me');
          const meData = await companyRes.json();
          if (companyRes.ok && meData.company) {
            setCompanyInfo(meData.company);
            setCompanyForm({
              name: meData.company.name || '',
              contactEmail: meData.company.settings?.contactEmail || '',
              contactPhone: meData.company.settings?.contactPhone || '',
              description: meData.company.settings?.description || ''
            });
          }
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Laden mislukt');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateRole = async (membershipId: string, role: string) => {
    setSavingId(membershipId);
    try {
      const res = await fetch('/api/companies/_/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, companyRole: role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bijwerken mislukt');
      setMembers(ms => ms.map(m => m.membershipId === membershipId ? { ...m, companyRole: role } : m));
    } catch (e: any) {
      alert(e?.message || 'Bijwerken mislukt');
    } finally {
      setSavingId(null);
    }
  };

  const deactivate = async (membershipId: string) => {
    if (!confirm('Weet je zeker dat je dit lid wilt deactiveren?')) return;
    setSavingId(membershipId);
    try {
      const res = await fetch('/api/companies/_/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, isActive: false })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deactiveren mislukt');
      setMembers(ms => ms.map(m => m.membershipId === membershipId ? { ...m, isActive: false } : m));
    } catch (e: any) {
      alert(e?.message || 'Deactiveren mislukt');
    } finally {
      setSavingId(null);
    }
  };

  const saveCompanyInfo = async () => {
    try {
      const res = await fetch(`/api/companies/${companyInfo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyForm.name,
          settings: {
            ...companyInfo.settings,
            contactEmail: companyForm.contactEmail,
            contactPhone: companyForm.contactPhone,
            description: companyForm.description
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt');
      setCompanyInfo(data.data);
      setEditingCompany(false);
      alert('Bedrijfsinformatie bijgewerkt');
    } catch (e: any) {
      alert(e?.message || 'Opslaan mislukt');
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="header-section">
          <h1>Team</h1>
          <p>Beheer teamleden binnen de actieve company.</p>
          {canManage && (
            <div style={{ marginTop: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const email = prompt('E‑mail adres van de uit te nodigen gebruiker');
                  if (!email) return;
                  const role = prompt('Rol (owner/admin/member/viewer)', 'member') || 'member';
                  setInviting(true);
                  try {
                    // We gebruiken de actieve company context in de API route
                    const companyRes = await fetch('/api/companies/_/members');
                    if (!companyRes.ok) throw new Error('Kon actieve company niet bepalen');
                    // Invite endpoint verwacht companyId; backend leest actieve company, maar voor zekerheid vragen we hem op
                    const inviteRes = await fetch('/api/memberships/invite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ companyId: (session as any)?.companyId, email, role })
                    });
                    const data = await inviteRes.json();
                    if (!inviteRes.ok) throw new Error(data.error || 'Uitnodigen mislukt');
                    alert('Uitnodiging aangemaakt. De gebruiker ontvangt een e‑mail.');
                  } catch (e: any) {
                    alert(e?.message || 'Uitnodigen mislukt');
                  } finally {
                    setInviting(false);
                  }
                }}
                disabled={inviting}
              >
                {inviting ? 'Uitnodigen…' : 'Nodig teamlid uit'}
              </button>
            </div>
          )}
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner-small" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Laden...</p>
          </div>
        ) : (
          <>
            {/* Company Information Section */}
            {companyInfo && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0 }}>Bedrijfsinformatie</h2>
                  {canManage && !editingCompany && (
                    <button className="btn btn-secondary" onClick={() => setEditingCompany(true)}>
                      Bewerken
                    </button>
                  )}
                </div>
                
                {editingCompany ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Bedrijfsnaam</label>
                      <input
                        type="text"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Contact E-mail</label>
                      <input
                        type="email"
                        value={companyForm.contactEmail}
                        onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Contact Telefoon</label>
                      <input
                        type="tel"
                        value={companyForm.contactPhone}
                        onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Beschrijving</label>
                      <textarea
                        value={companyForm.description}
                        onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                        rows={4}
                        style={{ width: '100%', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary" onClick={saveCompanyInfo}>
                        Opslaan
                      </button>
                      <button className="btn btn-secondary" onClick={() => setEditingCompany(false)}>
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>Bedrijfsnaam</div>
                      <div style={{ fontSize: '1em' }}>{companyInfo.name || '–'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>Contact E-mail</div>
                      <div style={{ fontSize: '1em' }}>{companyInfo.settings?.contactEmail || '–'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>Contact Telefoon</div>
                      <div style={{ fontSize: '1em' }}>{companyInfo.settings?.contactPhone || '–'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>Actieve Leden</div>
                      <div style={{ fontSize: '1em' }}>{members.filter(m => m.isActive).length}</div>
                    </div>
                    {companyForm.description && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>Beschrijving</div>
                        <div style={{ fontSize: '1em', whiteSpace: 'pre-wrap' }}>{companyForm.description}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Team Members Table */}
            <h2 style={{ marginBottom: '1rem' }}>Teamleden</h2>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>E‑mail</th>
                    <th>Rol</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.membershipId}>
                      <td>
                        <Link href={`/dashboard/team/${m.userId}`} style={{ color: '#9333ea', textDecoration: 'none' }}>
                          {m.name || '-'}
                        </Link>
                      </td>
                      <td>{m.email || '-'}</td>
                      <td>
                        {canManage ? (
                          <select
                            value={m.companyRole}
                            onChange={(e) => updateRole(m.membershipId, e.target.value)}
                            disabled={savingId === m.membershipId}
                          >
                            <option value="viewer">viewer</option>
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                            <option value="owner">owner</option>
                          </select>
                        ) : (
                          m.companyRole
                        )}
                      </td>
                      <td>{m.isActive ? 'Actief' : 'Inactief'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {canManage && m.isActive && (
                          <button className="btn btn-secondary" onClick={() => deactivate(m.membershipId)} disabled={savingId === m.membershipId}>Deactiveer</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

