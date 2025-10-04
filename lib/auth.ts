import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GitHubProvider from "next-auth/providers/github"
import { prisma } from "./prisma"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string | null
      bio?: string | null
      githubId?: number | null
    }
  }
}

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
      console.log("🔐 SignIn callback triggered:", { 
        provider: account?.provider, 
        userId: user?.id, 
        userEmail: user?.email 
      })
      
      // Allow sign in for GitHub provider
      if (account?.provider === "github") {
        return true
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirect callback:", { url, baseUrl })
      
      // Redirect to dashboard after successful signin
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
    async session({ session, token }) {
      console.log("📱 Session callback:", { sessionUserId: session.user?.id, tokenUserId: token.sub })
      
      // Add user ID and GitHub info to session
      if (session.user && token.sub) {
        session.user.id = token.sub
        // Add GitHub-specific data to session
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            username: true,
            bio: true,
            githubId: true,
          }
        })
        if (dbUser) {
          session.user.username = dbUser.username
          session.user.bio = dbUser.bio
          session.user.githubId = dbUser.githubId
        }
      }
      return session
    },
    async jwt({ token, user, account }) {
      console.log("🎫 JWT callback:", { userId: user?.id, accountProvider: account?.provider })
      
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
      }
      
      // Add user ID to token
      if (user) {
        token.sub = user.id
      }
      
      return token
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Store GitHub-specific data after successful sign in
      if (account?.provider === "github" && profile) {
        const githubProfile = profile as any
        try {
          // First try to find user by githubId, then by email
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { githubId: parseInt(githubProfile.id as string) },
                { email: githubProfile.email }
              ]
            }
          })

          if (existingUser) {
            // Update existing user
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                githubId: parseInt(githubProfile.id as string),
                username: githubProfile.login || null,
                email: githubProfile.email || null,
                name: githubProfile.name || null,
                image: githubProfile.avatar_url || null,
                bio: githubProfile.bio || null,
                accessToken: account.access_token || null,
                tokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : null,
                lastLoginAt: new Date(),
              }
            })
          } else {
            // Create new user
            await prisma.user.create({
              data: {
                githubId: parseInt(githubProfile.id as string),
                username: githubProfile.login || null,
                email: githubProfile.email || null,
                name: githubProfile.name || null,
                image: githubProfile.avatar_url || null,
                bio: githubProfile.bio || null,
                accessToken: account.access_token || null,
                tokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : null,
                lastLoginAt: new Date(),
              }
            })
          }
        } catch (error) {
          console.error("❌ Error updating user data:", error)
        }
      }
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin", // Error code passed in query string as ?error=
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
