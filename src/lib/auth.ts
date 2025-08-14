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
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER_BASE_URL!,
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
        
        // Ensure custom user exists and is synced
        const { user: dbUser } = await userRepo.findOrCreate({
          auth0Id: auth0Sub || `auth0|${user.email}`,
          email: user.email,
          name: user.name || user.email,
          avatar: user.image || undefined,
          emailVerified: true,
          metadata: {
            source: 'auth0',
            originalAuth0Data: { sub: auth0Sub }
          }
        });
        
        // Auto-add Appalti users to Appalti company (if present)
        if (user.email.endsWith('@appalti.nl')) {
          const appaltiCompany = await companyRepo.getAppaltiCompany();
          if (appaltiCompany && appaltiCompany._id && dbUser._id) {
            const existingMemberships = await membershipRepo.findByUser(dbUser._id.toString(), true);
            const alreadyMember = existingMemberships.some(m => m.companyId.toString() === appaltiCompany._id!.toString());
            if (!alreadyMember) {
              await membershipRepo.create({
                userId: dbUser._id.toString(),
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