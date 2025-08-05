// Auth0 exports voor v4.x
// De nieuwe versie gebruikt geen initAuth0 meer
export {
  handleAuth,
  handleLogin,
  handleLogout,
  handleCallback,
  handleProfile,
  getSession,
  getAccessToken,
  withApiAuthRequired,
  withPageAuthRequired,
} from '@auth0/nextjs-auth0';