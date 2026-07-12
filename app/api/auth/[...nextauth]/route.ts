import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Неверные данные для входа")
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          throw new Error("Пользователь не найден")
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isPasswordValid) {
          throw new Error("Неверный пароль")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      } else if (token.id) {
        // Update role from DB to avoid stale sessions when admin changes roles
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true }
        })
        if (dbUser) {
          token.role = dbUser.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 365 * 24 * 60 * 60, // 1 год (365 дней)
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
