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
  try {
    // Get NextAuth session
    const { auth } = await import('@/lib/auth');
    const session = await auth();
    
    if (!session || !session.user || !session.user.email) {
      return null;
    }
    
    // Get user from database
    const { getUserRepository } = await import('@/lib/db/repositories/userRepository');
    const userRepo = await getUserRepository();
    const dbUser = await userRepo.findByEmail(session.user.email);
    // Geen fallback-creatie hier: user sync gebeurt in NextAuth callbacks.signIn
    if (!dbUser || !dbUser._id) return null;
    
    // Get active membership
    const membershipRepo = await getMembershipRepository();
    const memberships = await membershipRepo.findByUser(dbUser._id.toString(), true);

    // Respecteer actieve company/tenant cookie als aanwezig
    const cookies = req.cookies;
    const activeCompanyCookie = cookies.get?.('activeCompanyId')?.value;
    const activeTenantCookie = cookies.get?.('activeTenantId')?.value;

    let activeMembership = memberships[0];
    if (activeCompanyCookie) {
      const match = memberships.find(m => m.companyId.toString() === activeCompanyCookie && (!activeTenantCookie || m.tenantId === activeTenantCookie));
      if (match) activeMembership = match;
    }
    
    return {
      userId: dbUser._id.toString(),
      auth0Id: session.user.id || dbUser.auth0Id,
      email: session.user.email,
      name: session.user.name || session.user.email,
      tenantId: activeMembership?.tenantId || 'default',
      companyId: activeMembership?.companyId.toString(),
      companyRole: activeMembership?.companyRole,
      platformRole: activeMembership?.platformRole,
      isAuthenticated: true,
      isAppaltiUser: session.user.email.endsWith('@appalti.nl')
    };
  } catch (error) {
    console.error('Error getting auth context:', error);
    return null;
  }
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