import { handleAuth, handleCallback } from '@/lib/auth0';
import { NextRequest } from 'next/server';
import { getUserRepository } from '@/lib/db/repositories/userRepository';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';
import { CompanyRole } from '@/lib/db/models/Membership';

const afterCallback = async (req: NextRequest, session: any) => {
  try {
    // Sync Auth0 user met MongoDB
    const userRepo = await getUserRepository();
    const { user: dbUser, isNew } = await userRepo.findOrCreate({
      auth0Id: session.user.sub,
      email: session.user.email,
      name: session.user.name || session.user.email,
      avatar: session.user.picture,
      emailVerified: session.user.email_verified || false,
    });

    // Update last login
    await userRepo.updateLastLogin(session.user.sub);

    // Als nieuwe gebruiker, check of ze Appalti email hebben
    if (isNew && session.user.email.endsWith('@appalti.nl')) {
      // Automatisch toevoegen aan Appalti company
      const companyRepo = await getCompanyRepository();
      const appaltiCompany = await companyRepo.getAppaltiCompany();
      
      if (appaltiCompany && appaltiCompany._id) {
        const membershipRepo = await getMembershipRepository();
        await membershipRepo.create({
          userId: dbUser._id!.toString(),
          companyId: appaltiCompany._id.toString(),
          tenantId: appaltiCompany.tenantId,
          companyRole: CompanyRole.MEMBER, // Default role voor nieuwe Appalti medewerkers
          invitedBy: appaltiCompany.createdBy.toString(),
        });
      }
    }

    // Voeg dbUserId toe aan session
    return {
      ...session,
      user: {
        ...session.user,
        dbUserId: dbUser._id?.toString(),
      },
    };
  } catch (error) {
    console.error('Error in afterCallback:', error);
    return session;
  }
};

export const GET = handleAuth({
  callback: handleCallback({ afterCallback }),
});