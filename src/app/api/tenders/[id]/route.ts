import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getTenderRepository } from '@/lib/db/repositories/tenderRepository';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  cpvCodes: z.array(z.string()).optional(),
  deadline: z.union([z.string(), z.date()]).optional(),
  status: z.enum(['draft','in_review','approved','archived']).optional(),
}).strict();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const repo = await getTenderRepository();
    const tender = await repo.findById(params.id, auth.tenantId);
    if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: tender });
  } catch (e) {
    console.error('Tender GET error', e);
    return NextResponse.json({ error: 'Failed to fetch tender' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => { throw new Error('Forbidden'); });
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    const repo = await getTenderRepository();
    const tender = await repo.update(params.id, auth.tenantId, parsed.data, auth.userId);
    if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: tender });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Tender PUT error', e);
    return NextResponse.json({ error: 'Failed to update tender' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => { throw new Error('Forbidden'); });
    const repo = await getTenderRepository();
    const ok = await repo.delete(params.id, auth.tenantId);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Tender DELETE error', e);
    return NextResponse.json({ error: 'Failed to delete tender' }, { status: 500 });
  }
}

