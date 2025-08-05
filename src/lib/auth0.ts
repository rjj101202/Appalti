// Auth0 exports voor v4.x
// Alle exports komen van de root package
import { 
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

// Re-export voor gebruik in andere files
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
};