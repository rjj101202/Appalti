import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getBidRepository } from '@/lib/db/repositories/bidRepository';

const createSchema = z.object({
  tenderId: z.string().min(1),
  clientCompanyId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => { throw new Error('Forbidden'); });
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    const repo = await getBidRepository();
    const bid = await repo.create({ ...parsed.data, tenantId: auth.tenantId, createdBy: auth.userId });
    return NextResponse.json({ success: true, data: bid }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Bids POST error', e);
    return NextResponse.json({ error: 'Failed to create bid' }, { status: 500 });
  }
}

