import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isAppaltiUser?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    isAppaltiUser?: boolean
  }
}