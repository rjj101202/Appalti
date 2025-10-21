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

  const canManage = session?.companyRole === 'admin' || session?.companyRole === 'owner' || (session as any)?.user?.isAppaltiUser;

  useEffect(() => {
    (async () => {
      try {
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
        )}
      </div>
    </DashboardLayout>
  );
}

