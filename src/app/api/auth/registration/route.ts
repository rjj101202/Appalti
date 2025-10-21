import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/context';

import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { CompanyRole } from '@/lib/db/models/Membership';
import { sendEmailViaGraph, buildOwnerApprovalNotificationHtml } from '@/lib/email';

/**
 * GET /api/auth/registration - Check registration status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has any memberships
    const membershipRepo = await getMembershipRepository();
    const memberships = await membershipRepo.findByUser(auth.userId);
    
    return NextResponse.json({
      isRegistered: memberships.length > 0,
      memberships: memberships.map(m => ({
        companyId: m.companyId.toString(),
        tenantId: m.tenantId,
        role: m.companyRole,
        isActive: m.isActive
      }))
    });
  } catch (error) {
    console.error('Registration check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/registration - Complete registration
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action, companyName, kvkNumber, inviteToken } = body;
    // Enforce verified email for registration flows
    if (process.env.REQUIRE_VERIFIED_EMAIL === '1') {
      // Fetch minimal user info to inspect verification
      const { getUserRepository } = await import('@/lib/db/repositories/userRepository');
      const userRepo = await getUserRepository();
      const dbUser = await userRepo.findByEmail(auth.email);
      if (!dbUser?.emailVerified) {
        return NextResponse.json(
          { error: 'Email verification required before registration' },
          { status: 403 }
        );
      }
    }
    
    const companyRepo = await getCompanyRepository();
    const membershipRepo = await getMembershipRepository();
    
    let company;
    let membership;
    
    switch (action) {
      case 'create-company':
        // Validate input
        if (!companyName) {
          return NextResponse.json(
            { error: 'Company name is required' },
            { status: 400 }
          );
        }
        
        // Check if company name is available
        const isAvailable = await companyRepo.isNameAvailable(companyName);
        if (!isAvailable) {
          return NextResponse.json(
            { error: 'Company name already exists' },
            { status: 400 }
          );
        }
        
        // Create new company
        company = await companyRepo.create({
          name: companyName,
          kvkNumber,
          createdBy: auth.userId
        });
        
        // Create owner membership
        membership = await membershipRepo.create({
          userId: auth.userId,
          companyId: company._id!.toString(),
          tenantId: company.tenantId,
          companyRole: CompanyRole.OWNER
        });
        
        break;
        
      case 'join-company':
        // Validate invite token
        if (!inviteToken) {
          return NextResponse.json(
            { error: 'Invite token is required' },
            { status: 400 }
          );
        }
        
        // Find and validate invite
        const invite = await membershipRepo.findInviteByToken(inviteToken);
        if (!invite) {
          return NextResponse.json(
            { error: 'Invalid or expired invite' },
            { status: 400 }
          );
        }
        
        // Get company
        company = await companyRepo.findById(invite.companyId.toString());
        if (!company) {
          return NextResponse.json(
            { error: 'Company not found' },
            { status: 404 }
          );
        }
        
        // Enforce invite email must match the authenticated user
        const userEmail = auth.email.toLowerCase();
        const inviteEmail = invite.email.toLowerCase();
        if (userEmail !== inviteEmail) {
          return NextResponse.json(
            { error: 'Invite email does not match your account' },
            { status: 403 }
          );
        }
        
        // If company has domain whitelist, enforce it
        const allowedDomains = company.settings?.allowedEmailDomains as string[] | undefined;
        if (allowedDomains && allowedDomains.length > 0) {
          const domain = userEmail.split('@')[1];
          const domainAllowed = allowedDomains.some(d => d.toLowerCase() === domain);
          if (!domainAllowed) {
            return NextResponse.json(
              { error: 'Your email domain is not allowed for this company' },
              { status: 403 }
            );
          }
        }
        
        // Create membership
        membership = await membershipRepo.create({
          userId: auth.userId,
          companyId: company._id!.toString(),
          tenantId: company.tenantId,
          companyRole: invite.invitedRole,
          invitedBy: invite.invitedBy.toString()
        });
        
        // Mark invite as accepted
        await membershipRepo.acceptInvite(inviteToken);
        
        break;
      
      // New flow: request join based on email domain match (no invite token)
      case 'request-domain-join': {
        const domain = auth.email.toLowerCase().split('@')[1];
        const companyRepo2 = await getCompanyRepository();
        const targetCompany = await companyRepo2.findByAllowedDomain(domain);
        if (!targetCompany) {
          return NextResponse.json({ error: 'No company configured for this email domain' }, { status: 404 });
        }

        // Notify owners by email; actual approval occurs via explicit invite action by owner
        try {
          const teamUrl = `${request.nextUrl.origin}/dashboard/team`;
          const html = buildOwnerApprovalNotificationHtml({ companyName: targetCompany.name, requesterEmail: auth.email, teamUrl });
          const owners = await (await getMembershipRepository()).findByCompany(targetCompany._id!.toString(), true);
          const ownerIds = owners.filter(m => m.companyRole === CompanyRole.OWNER).map(m => m.userId.toString());
          const { getUserRepository } = await import('@/lib/db/repositories/userRepository');
          const userRepo = await getUserRepository();
          const ownerEmails: string[] = [];
          for (const id of ownerIds) {
            const u = await userRepo.findById(id);
            if (u?.email) ownerEmails.push(u.email);
          }
          if (ownerEmails.length > 0) {
            await sendEmailViaGraph({ to: ownerEmails, subject: `Nieuw aanmeldverzoek voor ${targetCompany.name}`, html });
          }
        } catch (e) {
          console.warn('Owner notification email failed:', e);
        }

        return NextResponse.json({ success: true, requestedCompanyId: targetCompany._id?.toString() });
      }
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      company: {
        id: company._id?.toString(),
        name: company.name,
        tenantId: company.tenantId
      },
      membership: {
        id: membership._id?.toString(),
        role: membership.companyRole
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/registration/check-company - Check if company exists
 */
export async function checkCompany(request: NextRequest) {
  try {
    const { kvkNumber } = await request.json();
    
    if (!kvkNumber) {
      return NextResponse.json(
        { error: 'KVK number is required' },
        { status: 400 }
      );
    }
    
    const companyRepo = await getCompanyRepository();
    const company = await companyRepo.findByKvkNumber(kvkNumber);
    
    return NextResponse.json({
      exists: !!company,
      company: company ? {
        id: company._id?.toString(),
        name: company.name,
        tenantId: company.tenantId
      } : null
    });
    
  } catch (error) {
    console.error('Company check error:', error);
    return NextResponse.json(
      { error: 'Check failed' },
      { status: 500 }
    );
  }
}