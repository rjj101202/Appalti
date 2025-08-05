import { handleAuth } from '@/lib/auth0';

// Voor nu gebruik de standaard handleAuth
// Later kunnen we de afterCallback toevoegen wanneer de Auth0 SDK het ondersteunt
export const GET = handleAuth();