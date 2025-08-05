import NextAuth from "next-auth"
import Auth0Provider from "next-auth/providers/auth0"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"

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
      // Custom sign in logic
      if (!user.email) {
        return false;
      }
      
      // Auto-add Appalti users to Appalti company
      if (user.email.endsWith('@appalti.nl')) {
        // We'll implement this after basic auth works
        console.log('Appalti user signed in:', user.email);
      }
      
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
  },
  debug: process.env.NODE_ENV === "development",
});