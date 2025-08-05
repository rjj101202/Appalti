import { handleAuth, handleCallback, Session } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';
import { getUserRepository } from '@/lib/db/repositories/userRepository';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';

/**
 * Extended session met onze custom fields
 */
interface ExtendedSession extends Session {
  user: Session['user'] & {
    dbUserId?: string;        // MongoDB user ID
    tenantId?: string;        // Active tenant
    companyId?: string;       // Active company
    companyRole?: string;     // Role in company
    platformRole?: string;    // Platform role (indien Appalti)
  };
}

/**
 * After callback - sync Auth0 user met MongoDB
 */
const afterCallback = async (req: NextRequest, session: Session): Promise<ExtendedSession> => {
  try {
    const userRepo = await getUserRepository();
    const membershipRepo = await getMembershipRepository();
    
    // Extract user info from Auth0 session
    const { sub: auth0Id, email, name, picture } = session.user;
    
    // Find or create user in MongoDB
    const { user, isNew } = await userRepo.findOrCreate({
      auth0Id,
      email,
      name: name || email,
      avatar: picture,
      emailVerified: session.user.email_verified || false,
      metadata: {
        source: 'auth0',
        originalAuth0Data: session.user
      }
    });
    
    // Get user's active memberships
    const memberships = await membershipRepo.findByUser(user._id!.toString());
    
    // Extended session with custom fields
    const extendedSession: ExtendedSession = {
      ...session,
      user: {
        ...session.user,
        dbUserId: user._id!.toString()
      }
    };
    
    // Als user memberships heeft, pak de eerste actieve
    if (memberships.length > 0) {
      const primaryMembership = memberships[0];
      extendedSession.user.tenantId = primaryMembership.tenantId;
      extendedSession.user.companyId = primaryMembership.companyId.toString();
      extendedSession.user.companyRole = primaryMembership.companyRole;
      extendedSession.user.platformRole = primaryMembership.platformRole;
    }
    
    // Log voor debugging
    console.log('User synced:', {
      auth0Id,
      dbUserId: user._id?.toString(),
      isNew,
      membershipsCount: memberships.length
    });
    
    return extendedSession;
  } catch (error) {
    console.error('Error in Auth0 afterCallback:', error);
    // Return original session bij error
    return session as ExtendedSession;
  }
};

export const GET = handleAuth({
  callback: handleCallback({
    afterCallback
  })
});