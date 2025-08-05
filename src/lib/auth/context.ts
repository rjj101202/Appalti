import { NextRequest } from 'next/server';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { CompanyRole, PlatformRole } from '@/lib/db/models/Membership';

/**
 * Auth context met alle benodigde informatie
 */
export interface AuthContext {
  userId: string;           // MongoDB user ID
  auth0Id: string;          // Auth0 sub
  email: string;
  name: string;
  tenantId?: string;        // Active tenant
  companyId?: string;       // Active company
  companyRole?: CompanyRole;
  platformRole?: PlatformRole;
  isAuthenticated: boolean;
  isAppaltiUser: boolean;   // Has platform role
}

/**
 * Get auth context voor API routes
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  // Tijdelijk: return hardcoded auth context voor development
  // TODO: Implementeer Auth0 v5 of een andere auth oplossing
  return {
    userId: 'temp-user-id',
    auth0Id: 'temp-auth0-id',
    email: 'admin@appalti.nl',
    name: 'Admin User',
    tenantId: 'appalti',
    companyId: 'temp-company-id',
    companyRole: CompanyRole.OWNER,
    platformRole: PlatformRole.SUPER_ADMIN,
    isAuthenticated: true,
    isAppaltiUser: true
  };
}

/**
 * Require authenticated user
 */
export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const context = await getAuthContext(req);
  
  if (!context) {
    throw new Error('Unauthorized');
  }
  
  return context;
}

/**
 * Require specific tenant access
 */
export async function requireTenant(
  req: NextRequest, 
  tenantId: string
): Promise<AuthContext> {
  const context = await requireAuth(req);
  
  // Platform admins kunnen alle tenants zien
  if (context.platformRole && [PlatformRole.ADMIN, PlatformRole.SUPER_ADMIN].includes(context.platformRole)) {
    return context;
  }
  
  // Check of user toegang heeft tot deze tenant
  if (context.tenantId !== tenantId) {
    throw new Error('Access denied to this tenant');
  }
  
  return context;
}

/**
 * Require specific company role
 */
export async function requireCompanyRole(
  req: NextRequest,
  companyId: string,
  minRole: CompanyRole
): Promise<AuthContext> {
  const context = await requireAuth(req);
  
  // Platform admins hebben altijd toegang
  if (context.platformRole && [PlatformRole.ADMIN, PlatformRole.SUPER_ADMIN].includes(context.platformRole)) {
    return context;
  }
  
  // Check company match
  if (context.companyId !== companyId) {
    throw new Error('Access denied to this company');
  }
  
  // Check role hierarchy
  const roleHierarchy = {
    [CompanyRole.VIEWER]: 0,
    [CompanyRole.MEMBER]: 1,
    [CompanyRole.ADMIN]: 2,
    [CompanyRole.OWNER]: 3
  };
  
  const userLevel = roleHierarchy[context.companyRole || CompanyRole.VIEWER];
  const requiredLevel = roleHierarchy[minRole];
  
  if (userLevel < requiredLevel) {
    throw new Error(`Requires ${minRole} role or higher`);
  }
  
  return context;
}

/**
 * Require platform role
 */
export async function requirePlatformRole(
  req: NextRequest,
  minRole: PlatformRole
): Promise<AuthContext> {
  const context = await requireAuth(req);
  
  if (!context.platformRole) {
    throw new Error('Requires platform access');
  }
  
  // Check role hierarchy
  const roleHierarchy = {
    [PlatformRole.VIEWER]: 0,
    [PlatformRole.SUPPORT]: 1,
    [PlatformRole.ADMIN]: 2,
    [PlatformRole.SUPER_ADMIN]: 3
  };
  
  const userLevel = roleHierarchy[context.platformRole];
  const requiredLevel = roleHierarchy[minRole];
  
  if (userLevel < requiredLevel) {
    throw new Error(`Requires ${minRole} platform role or higher`);
  }
  
  return context;
}

/**
 * Switch active tenant/company
 */
export async function switchTenant(
  req: NextRequest,
  userId: string,
  newTenantId: string,
  newCompanyId: string
): Promise<boolean> {
  try {
    const membershipRepo = await getMembershipRepository();
    
    // Verify user has access to this tenant/company
    const membership = await membershipRepo.findByUserAndCompany(userId, newCompanyId);
    
    if (!membership || !membership.isActive || membership.tenantId !== newTenantId) {
      return false;
    }
    
    // Update session (dit moet via Auth0 session update)
    // Voor nu return true, implementatie volgt
    console.log('Switch tenant requested:', { userId, newTenantId, newCompanyId });
    
    return true;
  } catch (error) {
    console.error('Error switching tenant:', error);
    return false;
  }
}