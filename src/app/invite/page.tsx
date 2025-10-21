'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Avoid prerender issues: this page depends on client-side params and session
export const dynamic = 'force-dynamic';

function InviteAcceptContent() {
  const search = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'idle'|'working'|'error'|'done'|'needs_account'>('idle');
  const [message, setMessage] = useState<string>('');
  const [invitedEmail, setInvitedEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      const token = search.get('token');
      if (!token) {
        setStatus('error');
        setMessage('Ontbrekend invite token');
        return;
      }
      // Haal invite-info op voor branding en registratie-flow
      try {
        const infoRes = await fetch(`/api/memberships/invite-info?token=${encodeURIComponent(token)}`);
        const info = await infoRes.json();
        if (infoRes.ok && info?.success) {
          setInvitedEmail(info.email);
          setCompanyName(info.companyName || '');
        }
      } catch {/* ignore */}
      setStatus('working');
      try {
        const res = await fetch('/api/memberships/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteToken: token })
        });
        if (res.status === 401) {
          const url = typeof window !== 'undefined' ? window.location.href : '/invite?token=' + token;
          await signIn('auth0', { callbackUrl: url });
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          if (data?.error === 'Invite email does not match your account' || data?.error?.toLowerCase?.().includes('does not match')) {
            setStatus('needs_account');
            setMessage('Dit account komt niet overeen met de uitnodiging. Maak een nieuw account aan met het uitgenodigde e‑mailadres.');
            return;
          }
          setStatus('error');
          setMessage(data?.error || 'Uitnodiging accepteren mislukt');
          return;
        }
        try {
          const meRes = await fetch('/api/auth/registration');
          const me = await meRes.json();
          if (me?.memberships?.length === 1) {
            const m = me.memberships[0];
            await fetch('/api/auth/switch-tenant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companyId: m.companyId })
            });
          }
        } catch {/* no-op */}
        setStatus('done');
        setMessage('Uitnodiging geaccepteerd. Je wordt doorgestuurd...');
        setTimeout(() => router.replace('/dashboard'), 800);
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Er ging iets mis');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-2xl font-bold">Uitnodiging</h1>
        {status === 'working' && (
          <p className="text-gray-600">Bezig met accepteren van de uitnodiging...</p>
        )}
        {status === 'done' && (
          <p className="text-green-600">{message}</p>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-600">{message}</p>
            <button className="btn btn-primary" onClick={() => router.replace('/')}>Terug naar home</button>
          </>
        )}
        {status === 'needs_account' && (
          <>
            <p className="text-gray-700" style={{marginBottom:'0.5rem'}}>
              Je bent uitgenodigd voor <strong>{companyName || 'het bedrijf'}</strong> met e‑mail <strong>{invitedEmail}</strong>.
            </p>
            <p className="text-gray-600" style={{marginBottom:'1rem'}}>Log uit en maak een account aan met het uitgenodigde e‑mailadres, of wissel van account.</p>
            <div style={{display:'flex', gap:'0.5rem', justifyContent:'center'}}>
              <button className="btn btn-secondary" onClick={async () => { await signIn('auth0', { callbackUrl: typeof window !== 'undefined' ? window.location.href : '/invite' }); }}>
                Wissel van account
              </button>
              <a className="btn btn-primary" href={`/auth/signup?token=${encodeURIComponent(search.get('token') || '')}&email=${encodeURIComponent(invitedEmail || '')}`}>
                Registreer met dit e‑mailadres
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <InviteAcceptContent />
    </Suspense>
  );
}


