import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';

// POST /api/clients/[id]/provision-company
// Maakt (indien ontbrekend) een eigen Company/tenant voor de client en koppelt deze via linkedCompanyId
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => { throw new Error('Forbidden'); });

    const clientRepo = await getClientCompanyRepository();
    const companyRepo = await getCompanyRepository();

    const client = await clientRepo.findById(params.id, auth.tenantId);
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    if (client.linkedCompanyId) {
      return NextResponse.json({ success: true, linkedCompanyId: client.linkedCompanyId.toString(), alreadyExists: true });
    }

    // Maak company aan voor de client in een eigen tenant
    const company = await companyRepo.create({
      name: client.name,
      kvkNumber: client.kvkNumber,
      createdBy: auth.userId
    });

    const updated = await clientRepo.update(params.id, auth.tenantId, { linkedCompanyId: company._id as any }, auth.userId);
    return NextResponse.json({ success: true, linkedCompanyId: company._id?.toString(), company });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Provision company error:', e);
    return NextResponse.json({ error: 'Failed to provision company' }, { status: 500 });
  }
}

