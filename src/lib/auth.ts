import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { runSingleQuery, runWriteQuery } from './neo4j';
import { v4 as uuidv4 } from 'uuid';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await runSingleQuery<{
          u: { id: string; email: string; username: string; name: string; password: string; avatar: string; verified: boolean };
        }>(
          'MATCH (u:User {email: $email}) RETURN u',
          { email: credentials.email }
        );

        if (!result?.u) return null;

        const isValid = await bcrypt.compare(credentials.password, result.u.password);
        if (!isValid) return null;

        return {
          id: result.u.id,
          email: result.u.email,
          name: result.u.name,
          image: result.u.avatar || null,
          username: result.u.username,
          verified: result.u.verified,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    maxAge: 15 * 60, // 15 minutes access token
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        const existing = await runSingleQuery<{ u: { id: string } }>(
          'MATCH (u:User {email: $email}) RETURN u',
          { email: user.email }
        );

        if (!existing) {
          const id = uuidv4();
          const username = (user.email?.split('@')[0] || '') + '_' + id.slice(0, 4);
          await runWriteQuery(
            `CREATE (u:User {
              id: $id,
              email: $email,
              username: $username,
              name: $name,
              avatar: $avatar,
              bio: '',
              website: '',
              location: '',
              dob: '',
              privacy: 'public',
              verified: false,
              coverPhoto: '',
              createdAt: datetime(),
              updatedAt: datetime()
            })`,
            {
              id,
              email: user.email,
              username,
              name: user.name || username,
              avatar: user.image || '',
            }
          );
          (user as unknown as Record<string, unknown>).id = id;
          (user as unknown as Record<string, unknown>).username = username;
        } else {
          (user as unknown as Record<string, unknown>).id = existing.u.id;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as unknown as Record<string, unknown>).id as string;
        token.username = (user as unknown as Record<string, unknown>).username as string;
        token.verified = (user as unknown as Record<string, unknown>).verified as boolean;
      }
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.image = session.image;
        token.username = session.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).id = token.id;
        (session.user as unknown as Record<string, unknown>).username = token.username;
        (session.user as unknown as Record<string, unknown>).verified = token.verified;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
