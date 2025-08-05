import { initAuth0 } from '@auth0/nextjs-auth0';

// Auth0 configuratie
export const auth0Instance = initAuth0({
  baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || '',
  clientID: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  secret: process.env.AUTH0_SECRET || '',
  clockTolerance: 60,
  httpTimeout: 5000,
  authorizationParams: {
    scope: 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE,
  },
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
  session: {
    rollingDuration: 60 * 60 * 24 * 7, // 7 dagen
    absoluteDuration: 60 * 60 * 24 * 30, // 30 dagen
  },
});

export const {
  handleAuth,
  handleLogin,
  handleLogout,
  handleCallback,
  handleProfile,
  getSession,
  getAccessToken,
  withApiAuthRequired,
  withPageAuthRequired,
} = auth0Instance;