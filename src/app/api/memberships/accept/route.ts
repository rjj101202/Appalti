import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';

// POST /api/memberships/accept
// Body: { inviteToken: string }
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { inviteToken } = await request.json();

    if (!inviteToken) {
      return NextResponse.json({ error: 'inviteToken is required' }, { status: 400 });
    }

    const companyRepo = await getCompanyRepository();
    const membershipRepo = await getMembershipRepository();

    const invite = await membershipRepo.findInviteByToken(inviteToken);
    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    // Company must exist
    const company = await companyRepo.findById(invite.companyId.toString());
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Email must match authenticated user
    const userEmail = auth.email.toLowerCase();
    if (invite.email.toLowerCase() !== userEmail) {
      return NextResponse.json({ error: 'Invite email does not match your account' }, { status: 403 });
    }

    // If company has domain whitelist, enforce it
    const allowedDomains = company.settings?.allowedEmailDomains as string[] | undefined;
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = userEmail.split('@')[1];
      const domainAllowed = allowedDomains.some(d => d.toLowerCase() === domain);
      if (!domainAllowed) {
        return NextResponse.json({ error: 'Your email domain is not allowed for this company' }, { status: 403 });
      }
    }

    // Create membership
    const membership = await membershipRepo.create({
      userId: auth.userId,
      companyId: company._id!.toString(),
      tenantId: company.tenantId,
      companyRole: invite.invitedRole,
      invitedBy: invite.invitedBy.toString(),
    });

    // Mark invite as accepted
    await membershipRepo.acceptInvite(inviteToken);

    return NextResponse.json({ success: true, membershipId: membership._id?.toString() });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}