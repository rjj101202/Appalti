import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { CompanyRole } from '@/lib/db/models/Membership';
import { checkRateLimit } from '@/lib/rate-limit';
import { writeAudit } from '@/lib/audit';

// POST /api/memberships/invite
// Body: { companyId: string, email: string, role: CompanyRole }
export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'membership:invite');
    if (!rl.allow) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const auth = await requireAuth(request);
    const { companyId, email, role } = await request.json();

    if (!companyId || !email || !role) {
      return NextResponse.json({ error: 'companyId, email, and role are required' }, { status: 400 });
    }

    // Require at least ADMIN to invite
    await requireCompanyRole(request, companyId, CompanyRole.ADMIN);

    const companyRepo = await getCompanyRepository();
    const membershipRepo = await getMembershipRepository();

    // Verify company exists
    const company = await companyRepo.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Enforce domain whitelist if configured
    const allowedDomains = company.settings?.allowedEmailDomains as string[] | undefined;
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = email.toLowerCase().split('@')[1];
      const domainAllowed = allowedDomains.some(d => d.toLowerCase() === domain);
      if (!domainAllowed) {
        return NextResponse.json({ error: 'Email domain not allowed for this company' }, { status: 403 });
      }
    }

    // Create invite
    const invite = await membershipRepo.createInvite(
      email.toLowerCase(),
      companyId,
      company.tenantId,
      role,
      auth.userId
    );

    await writeAudit({
      action: 'membership.invite.create',
      actorUserId: auth.userId,
      tenantId: company.tenantId,
      companyId,
      resourceType: 'membershipInvite',
      resourceId: invite._id?.toString(),
      metadata: { email: email.toLowerCase(), role }
    });

    return NextResponse.json({ success: true, inviteToken: invite.inviteToken });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}