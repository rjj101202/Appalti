import { ObjectId } from 'mongodb';

// Company-level roles
export enum CompanyRole {
  OWNER = 'owner',       // Kan alles, inclusief bedrijf verwijderen
  ADMIN = 'admin',       // Kan alles behalve bedrijf verwijderen
  MEMBER = 'member',     // Kan werken met client companies en bids
  VIEWER = 'viewer'      // Kan alleen bekijken
}

// Platform-level roles (alleen voor Appalti medewerkers)
export enum PlatformRole {
  SUPER_ADMIN = 'super_admin',  // Volledige toegang tot alle tenants
  ADMIN = 'admin',              // Kan tenants beheren
  SUPPORT = 'support',          // Kan helpen met support
  VIEWER = 'viewer'             // Kan statistieken bekijken
}

// Membership document interface voor MongoDB
export interface Membership {
  _id?: ObjectId;
  userId: ObjectId;                 // Reference naar User
  companyId: ObjectId;              // Reference naar Company
  tenantId: string;                 // Gekopieerd van Company voor queries
  companyRole: CompanyRole;         // Rol binnen het bedrijf
  platformRole?: PlatformRole;      // Platform rol (alleen voor Appalti)
  isActive: boolean;                // Is membership actief?
  permissions?: string[];           // Extra specifieke permissions
  invitedBy?: ObjectId;             // Wie heeft deze user uitgenodigd
  invitedAt?: Date;                 // Wanneer uitgenodigd
  acceptedAt?: Date;                // Wanneer geaccepteerd
  deactivatedAt?: Date;             // Wanneer gedeactiveerd
  deactivatedBy?: ObjectId;         // Door wie gedeactiveerd
  deactivationReason?: string;      // Reden van deactivatie
  createdAt: Date;
  updatedAt: Date;
}

// Input voor het aanmaken van een membership
export interface CreateMembershipInput {
  userId: string;
  companyId: string;
  tenantId: string;
  companyRole: CompanyRole;
  platformRole?: PlatformRole;
  invitedBy?: string;
  permissions?: string[];
}

// Input voor het updaten van een membership
export interface UpdateMembershipInput {
  companyRole?: CompanyRole;
  platformRole?: PlatformRole;
  isActive?: boolean;
  permissions?: string[];
}

// Voor het uitnodigen van nieuwe users
export interface MembershipInvite {
  _id?: ObjectId;
  email: string;
  companyId: ObjectId;
  tenantId: string;
  invitedRole: CompanyRole;
  invitedBy: ObjectId;
  inviteToken: string;              // Unieke token voor invite link
  expiresAt: Date;                  // Wanneer verloopt de invite
  acceptedAt?: Date;                // Wanneer geaccepteerd
  createdAt: Date;
}