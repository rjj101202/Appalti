import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { getUserRepository } from '@/lib/db/repositories/userRepository';

// GET /api/clients/[id]/members - lijst teamleden van de gekoppelde client-tenant
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.MEMBER).catch(() => { throw new Error('Forbidden'); });

    const clientRepo = await getClientCompanyRepository();
    const client = await clientRepo.findById(params.id, auth.tenantId);
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    if (!client.linkedCompanyId) return NextResponse.json({ success: true, data: [] });

    const membershipRepo = await getMembershipRepository();
    const userRepo = await getUserRepository();
    const members = await membershipRepo.findByCompany(client.linkedCompanyId.toString(), true);
    const enriched = await Promise.all(members.map(async m => {
      const u = await userRepo.findById(m.userId.toString());
      return {
        membershipId: m._id?.toString(),
        userId: m.userId.toString(),
        email: u?.email,
        name: u?.name,
        companyRole: m.companyRole,
        isActive: m.isActive,
      };
    }));
    return NextResponse.json({ success: true, data: enriched });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Client members list error:', e);
    return NextResponse.json({ error: 'Failed to list client members' }, { status: 500 });
  }
}

