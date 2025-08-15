'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function ProfilePage() {
	const [me, setMe] = useState<{ name?: string; email?: string; image?: string } | null>(null);
	const [loading, setLoading] = useState(true);
	const [name, setName] = useState('');
	const [image, setImage] = useState('');
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteRole, setInviteRole] = useState('member');
	const [inviteResult, setInviteResult] = useState<string>('');
	const [saveMsg, setSaveMsg] = useState<string>('');
	const [uploadMsg, setUploadMsg] = useState<string>('');

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch('/api/users/me');
				const json = await res.json();
				if (json?.data) {
					setMe(json.data);
					setName(json.data.name || '');
					setImage(json.data.image || '');
				}
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	async function saveProfile(e: React.FormEvent) {
		e.preventDefault();
		setSaveMsg('');
		const res = await fetch('/api/users/me', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, image })
		});
		if (res.ok) setSaveMsg('Opgeslagen'); else setSaveMsg('Opslaan mislukt');
	}

	async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files || e.target.files.length === 0) return;
		setUploadMsg('');
		const file = e.target.files[0];
		const form = new FormData();
		form.append('file', file);
		const res = await fetch('/api/users/me/avatar', { method: 'POST', body: form });
		const json = await res.json();
		if (res.ok) { setImage(json.url); setUploadMsg('Geüpload'); } else { setUploadMsg(json.error || 'Upload mislukt'); }
	}

	async function sendInvite(e: React.FormEvent) {
		e.preventDefault();
		setInviteResult('');
		// haal companyId op uit registration overview
		const reg = await fetch('/api/auth/registration').then(r=>r.json());
		const companyId = reg?.memberships?.[0]?.companyId;
		if (!companyId) { setInviteResult('Geen actieve company'); return; }
		const res = await fetch('/api/memberships/invite', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ companyId, email: inviteEmail, role: inviteRole })
		});
		const json = await res.json();
		if (res.ok) setInviteResult(`Uitnodiging verstuurd. Token: ${json.inviteToken}`);
		else setInviteResult(json.error || 'Versturen mislukt');
	}

	return (
		<DashboardLayout>
			<div style={{ display: 'grid', gap: '1rem', maxWidth: 700 }}>
				<h1>Mijn Profiel</h1>
				{loading ? (
					<p>Bezig met laden...</p>
				) : (
					<>
						<section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
							<h3>Persoonlijke gegevens</h3>
							<form onSubmit={saveProfile} style={{ display: 'grid', gap: 8 }}>
								<label>
									Naam
									<input value={name} onChange={e=>setName(e.target.value)} className="input" />
								</label>
								<label>
									Avatar URL
									<input value={image} onChange={e=>setImage(e.target.value)} className="input" />
								</label>
								<label>
									Upload avatar
									<input type="file" accept="image/*" onChange={uploadAvatar} className="input" />
									{uploadMsg && <span style={{ color: '#6b7280' }}>{uploadMsg}</span>}
								</label>
								<button className="btn btn-primary" type="submit">Opslaan</button>
								{saveMsg && <span style={{ color: '#6b7280' }}>{saveMsg}</span>}
							</form>
						</section>

						<section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
							<h3>Team uitnodigen</h3>
							<form onSubmit={sendInvite} style={{ display: 'grid', gap: 8 }}>
								<label>
									E‑mail
									<input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} className="input" placeholder="naam@bedrijf.nl" />
								</label>
								<label>
									Rol
									<select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} className="input">
										<option value="member">Member</option>
										<option value="admin">Admin</option>
									</select>
								</label>
								<button className="btn btn-primary" type="submit">Verstuur uitnodiging</button>
								{inviteResult && <span style={{ color: inviteResult.startsWith('Uitnodiging') ? '#16a34a' : '#dc2626' }}>{inviteResult}</span>}
							</form>
							<p style={{ color: '#6b7280', fontSize: 12 }}>Let op: domein‑whitelist kan uitnodigingen beperken.</p>
						</section>
					</>
				)}
			</div>
		</DashboardLayout>
	);
}