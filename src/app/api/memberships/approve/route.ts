import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { getUserRepository } from '@/lib/db/repositories/userRepository';
import { writeAudit } from '@/lib/audit';

// POST /api/memberships/approve
// Body: { inviteToken: string, companyId: string }
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { inviteToken, companyId } = await request.json();
    if (!inviteToken || !companyId) return NextResponse.json({ error: 'inviteToken and companyId are required' }, { status: 400 });

    // Only OWNER/ADMIN may approve invites for their company
    await requireCompanyRole(request, companyId, CompanyRole.ADMIN).catch(() => { throw new Error('Forbidden'); });

    const membershipRepo = await getMembershipRepository();
    const userRepo = await getUserRepository();

    const invite = await membershipRepo.findInviteByToken(inviteToken);
    if (!invite || invite.companyId.toString() !== companyId) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    // Find or create the user by email (user must sign in via Auth0 afterwards to sync fully)
    const existingUser = await userRepo.findByEmail(invite.email);
    const userId = existingUser?._id?.toString();
    if (!userId) {
      // We do not auto-create application users here; user must login via Auth0 first.
      return NextResponse.json({ error: 'User must login once before approval' }, { status: 412 });
    }

    // If already a member, just accept invite
    const existingMembership = await membershipRepo.findByUserAndCompany(userId, companyId);
    if (existingMembership && existingMembership.isActive) {
      await membershipRepo.acceptInvite(inviteToken);
      return NextResponse.json({ success: true, membershipId: existingMembership._id?.toString(), alreadyMember: true });
    }

    const membership = await membershipRepo.create({
      userId,
      companyId,
      tenantId: invite.tenantId,
      companyRole: invite.invitedRole,
      invitedBy: auth.userId,
    });

    await membershipRepo.acceptInvite(inviteToken);

    await writeAudit({
      action: 'membership.invite.approve',
      actorUserId: auth.userId,
      tenantId: invite.tenantId,
      companyId,
      resourceType: 'membership',
      resourceId: membership._id?.toString(),
      metadata: { inviteToken }
    });

    return NextResponse.json({ success: true, membershipId: membership._id?.toString() });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Approve invite error:', e);
    return NextResponse.json({ error: 'Failed to approve invite' }, { status: 500 });
  }
}
