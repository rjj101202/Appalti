import { NextRequest, NextResponse } from 'next/server';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';
import { getUserRepository } from '@/lib/db/repositories/userRepository';

// GET /api/memberships/invite-info?token=...
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });
    const membershipRepo = await getMembershipRepository();
    const invite = await membershipRepo.findInviteByToken(token);
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

    const companyRepo = await getCompanyRepository();
    const userRepo = await getUserRepository();

    const company = await companyRepo.findById(invite.companyId.toString());
    const inviter = invite.invitedBy ? await userRepo.findById(invite.invitedBy.toString()) : null;

    return NextResponse.json({
      success: true,
      email: invite.email,
      companyName: company?.name || 'Onbekend bedrijf',
      inviterName: inviter?.name || undefined,
    });
  } catch (e) {
    console.error('Invite-info error:', e);
    return NextResponse.json({ error: 'Failed to get invite info' }, { status: 500 });
  }
}
