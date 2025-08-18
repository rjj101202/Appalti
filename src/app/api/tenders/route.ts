import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getTenderRepository } from '@/lib/db/repositories/tenderRepository';

const createSchema = z.object({
  clientCompanyId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  cpvCodes: z.array(z.string()).optional(),
  deadline: z.union([z.string(), z.date()]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const { searchParams } = new URL(request.url);
    const clientCompanyId = searchParams.get('clientCompanyId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const cursor = searchParams.get('cursor') || undefined;
    const repo = await getTenderRepository();
    const { items, nextCursor } = await repo.findPaginated(auth.tenantId, { clientCompanyId, limit, cursor, status: status || undefined });
    return NextResponse.json({ success: true, data: items, nextCursor });
  } catch (e) {
    console.error('Tenders GET error', e);
    return NextResponse.json({ error: 'Failed to fetch tenders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    // Mutaties: minimaal ADMIN
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => { throw new Error('Forbidden'); });
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    const repo = await getTenderRepository();
    const tender = await repo.create({ ...parsed.data, tenantId: auth.tenantId, createdBy: auth.userId });
    return NextResponse.json({ success: true, data: tender }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Tenders POST error', e);
    return NextResponse.json({ error: 'Failed to create tender' }, { status: 500 });
  }
}

