import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GitHubProvider from "next-auth/providers/github"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Store GitHub-specific data
      if (account?.provider === "github" && profile) {
        try {
          await prisma.user.upsert({
            where: { githubId: profile.id as number },
            update: {
              username: profile.login as string,
              email: profile.email as string,
              name: profile.name as string,
              avatarUrl: profile.avatar_url as string,
              bio: profile.bio as string,
              accessToken: account.access_token as string,
              tokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : null,
              lastLoginAt: new Date(),
            },
            create: {
              githubId: profile.id as number,
              username: profile.login as string,
              email: profile.email as string,
              name: profile.name as string,
              avatarUrl: profile.avatar_url as string,
              bio: profile.bio as string,
              accessToken: account.access_token as string,
              tokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : null,
              lastLoginAt: new Date(),
            },
          })
        } catch (error) {
          console.error("Error updating user data:", error)
          return false
        }
      }
      return true
    },
    async session({ session, user }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
  },
  pages: {
    signIn: "/signin",
    signUp: "/signup",
    error: "/signin", // Error code passed in query string as ?error=
  },
  session: {
    strategy: "database",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
