'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function SignupContent() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const email = search.get('email') || '';
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const infoRes = await fetch(`/api/memberships/invite-info?token=${encodeURIComponent(token)}`);
        const info = await infoRes.json();
        if (infoRes.ok && info?.success) setCompanyName(info.companyName || '');
      } catch {/* ignore */}
    })();
  }, [token]);

  const startSignup = async () => {
    // Start Auth0 Universal Login in signup mode and prefill email
    const callbackUrl = typeof window !== 'undefined' ? window.location.origin + `/invite?token=${encodeURIComponent(token)}` : '/invite?token=' + token;
    await signIn('auth0', {
      callbackUrl,
      // Forwarded to Auth0 as extra params
      screen_hint: 'signup',
      login_hint: email || undefined,
    } as any);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Account aanmaken</h1>
          {companyName && (
            <p className="text-gray-600 mt-2">Je wordt gekoppeld aan <strong>{companyName}</strong>.</p>
          )}
          {email && (
            <p className="text-gray-600">Uitgenodigd e‑mailadres: <strong>{email}</strong></p>
          )}
        </div>
        <div>
          <button
            onClick={startSignup}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Registreer met Auth0
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
