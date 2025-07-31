import { handleAuth, handleCallback, handleLogin, handleLogout } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

const afterCallback = async (req: NextRequest, session: any) => {
  // Voor nu houden we het simpel - later voegen we database logic toe
  console.log('User logged in:', session.user.email);
  return session;
};

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      prompt: 'login',
    },
    returnTo: '/dashboard',
  }),
  callback: handleCallback({
    afterCallback,
  }),
  logout: handleLogout({
    returnTo: '/',
  }),
});