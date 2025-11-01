import NextAuth from "next-auth"
import Auth0Provider from "next-auth/providers/auth0"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"
import { getUserRepository } from "@/lib/db/repositories/userRepository"
import { getCompanyRepository } from "@/lib/db/repositories/companyRepository"
import { getMembershipRepository } from "@/lib/db/repositories/membershipRepository"
import { CompanyRole } from "@/lib/db/models/Membership"

const NEXTAUTH_DEBUG = process.env.NEXTAUTH_DEBUG === '1' || process.env.NODE_ENV === 'development';

export const { 
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Vertrouw host header (Vercel preview/prod) om "Configuration" errors te voorkomen
  // Alternatief/aanvulling: zet NEXTAUTH_URL of AUTH_TRUST_HOST=1 in env
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER_BASE_URL!,
      // Disable PKCE/state checks to prevent first-callback cookie parsing issues on Vercel
      // CSRF/state protections are handled by Auth0; we rely on secure redirects
      checks: [],
      authorization: {
        params: {
          prompt: "login",
          scope: "openid profile email offline_access",
        },
      },
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    async session({ session, token, user }) {
      if (NEXTAUTH_DEBUG) console.log('[NextAuth] Session callback in', { hasSession: !!session, userId: user?.id });
      // Add custom fields to session
      if (session?.user) {
        session.user.id = user.id;
        
        // Check if Appalti user
        if (session.user.email?.endsWith('@appalti.nl')) {
          // We'll add role logic here later
          session.user.isAppaltiUser = true;
        }

        // Verrijk sessie met tenant/company context en rollen
        try {
          const membershipRepo = await getMembershipRepository();
          const memberships = await membershipRepo.findByUser(user.id, true);
          const active = memberships[0];
          (session as any).tenantId = active?.tenantId;
          (session as any).companyId = active?.companyId?.toString();
          (session as any).companyRole = active?.companyRole;
          (session as any).platformRole = active?.platformRole;
        } catch (e) {
          if (NEXTAUTH_DEBUG) console.warn('[NextAuth] Session enrichment failed:', e);
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log('[NextAuth] SignIn callback:', {
        email: user?.email,
        provider: account?.provider,
        type: account?.type,
        providerAccountId: account?.providerAccountId,
      });
      
      // Require email for mapping
      if (!user.email) {
        console.error('[NextAuth] No email found for user');
        return false;
      }
      
      try {
        const userRepo = await getUserRepository();
        const companyRepo = await getCompanyRepository();
        const membershipRepo = await getMembershipRepository();
        
        // Prefer Auth0 subject if available
        const auth0Sub = account?.providerAccountId || '';
        const emailVerifiedFromProvider = (profile as any)?.email_verified === true;
        
        // NOTE: We do NOT create a separate custom user anymore!
        // NextAuth Adapter already creates the user in the users collection.
        // We find the user by email (since user.id might be UUID format)
        
        const dbUser = await userRepo.findByEmail(user.email);
        
        if (!dbUser) {
          console.error('[NextAuth] User not found in database after adapter created it:', user.email);
          return false; // Deny login if user doesn't exist
        }
        
        // Update metadata on the NextAuth user
        try {
          await userRepo.update(dbUser._id!.toString(), {
            emailVerified: emailVerifiedFromProvider,
            lastLogin: new Date(),
            // DO NOT update avatar - preserve custom uploaded avatars
          });
        } catch (e) {
          if (NEXTAUTH_DEBUG) console.warn('[NextAuth] User metadata update failed:', e);
        }

        // Optionally block unverified emails in production
        if (process.env.REQUIRE_VERIFIED_EMAIL === '1' && !emailVerifiedFromProvider) {
          console.warn('[NextAuth] Email not verified, denying sign-in for', user.email);
          return '/auth/error?error=Verification';
        }
        
        // Auto-add Appalti users to Appalti company (if present)
        if (user.email.endsWith('@appalti.nl')) {
          const appaltiCompany = await companyRepo.getAppaltiCompany();
          if (appaltiCompany && appaltiCompany._id && dbUser._id) {
            const existingMemberships = await membershipRepo.findByUser(dbUser._id.toString(), true);
            const alreadyMember = existingMemberships.some(m => m.companyId.toString() === appaltiCompany._id!.toString());
            if (!alreadyMember) {
              await membershipRepo.create({
                userId: dbUser._id.toString(), // Use MongoDB ObjectId from dbUser
                companyId: appaltiCompany._id.toString(),
                tenantId: appaltiCompany.tenantId,
                companyRole: CompanyRole.MEMBER,
                invitedBy: appaltiCompany.createdBy.toString(),
              });
            }
          }
        }
      } catch (e) {
        console.error('[NextAuth] SignIn sync error:', e);
        // Fail closed to prevent orphan sessions
        return false;
      }
      
      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth] Redirect callback:', { url, baseUrl });
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
  },
  debug: NEXTAUTH_DEBUG,
});