import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isAppaltiUser?: boolean
    } & DefaultSession["user"]
    tenantId?: string
    companyId?: string
    companyRole?: string
    platformRole?: string
  }

  interface User {
    id: string
    isAppaltiUser?: boolean
  }
}