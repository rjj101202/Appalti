import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { getUserRepository } from '@/lib/db/repositories/userRepository';

// GET /api/companies/[id]/members - list members of a company (tenant-scoped)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    // Require at least MEMBER to view, ADMIN to manage; here we only list, so MEMBER suffices
    await requireCompanyRole(request, params.id, CompanyRole.MEMBER).catch(() => { throw new Error('Forbidden'); });

    const membershipRepo = await getMembershipRepository();
    const userRepo = await getUserRepository();
    const members = await membershipRepo.findByCompany(params.id, true);

    const enriched = await Promise.all(members.map(async m => {
      const u = await userRepo.findById(m.userId.toString());
      return {
        membershipId: m._id?.toString(),
        userId: m.userId.toString(),
        email: u?.email,
        name: u?.name,
        companyRole: m.companyRole,
        platformRole: m.platformRole,
        isActive: m.isActive,
        tenantId: m.tenantId,
      };
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Members list error:', e);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
}

