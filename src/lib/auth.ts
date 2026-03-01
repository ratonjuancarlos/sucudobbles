import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

const nextAuth = NextAuth({
  trustHost: true,
  debug: process.env.NODE_ENV !== 'production',
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});

export const { handlers, signIn, signOut } = nextAuth;

// When SKIP_AUTH=true, return a fake session with a demo user
async function ensureDemoUser() {
  const existing = await prisma.user.findUnique({ where: { email: 'demo@sucudobble.com' } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: 'demo-user',
      name: 'Demo',
      email: 'demo@sucudobble.com',
    },
  });
}

export const auth = SKIP_AUTH
  ? async () => {
      const user = await ensureDemoUser();
      return {
        user: { id: user.id, name: user.name, email: user.email, image: user.image },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  : nextAuth.auth;
