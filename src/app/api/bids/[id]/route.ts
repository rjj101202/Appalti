import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getBidRepository } from '@/lib/db/repositories/bidRepository';
import { getTenderRepository } from '@/lib/db/repositories/tenderRepository';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    }

    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => {
      throw new Error('Forbidden');
    });

    const bidRepo = await getBidRepository();
    const bid = await bidRepo.findById(params.id, auth.tenantId);
    if (!bid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const deleted = await bidRepo.delete(params.id, auth.tenantId);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (bid.tenderId) {
      const tenderRepo = await getTenderRepository();
      try {
        await tenderRepo.delete(bid.tenderId.toString(), auth.tenantId);
      } catch (err) {
        console.warn('Failed to delete tender linked to bid', params.id, err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Bid DELETE error', e);
    return NextResponse.json({ error: 'Failed to delete bid' }, { status: 500 });
  }
}

