import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';

const bodySchema = z.object({
	companyId: z.string().min(1)
});

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request);
		const parsed = bodySchema.safeParse(await request.json());
		if (!parsed.success) {
			return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
		}
		const { companyId } = parsed.data;

		const membershipRepo = await getMembershipRepository();
		const membership = await membershipRepo.findByUserAndCompany(auth.userId, companyId);
		if (!membership || !membership.isActive) {
			return NextResponse.json({ error: 'Not a member of this company' }, { status: 403 });
		}

		const companyRepo = await getCompanyRepository();
		const company = await companyRepo.findById(companyId);
		if (!company) {
			return NextResponse.json({ error: 'Company not found' }, { status: 404 });
		}

		const res = NextResponse.json({ success: true, tenantId: membership.tenantId, companyId });
		const isProd = process.env.NODE_ENV === 'production';
		res.cookies.set('activeCompanyId', companyId, {
			httpOnly: true,
			secure: isProd,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60
		});
		res.cookies.set('activeTenantId', membership.tenantId, {
			httpOnly: true,
			secure: isProd,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60
		});
		return res;
	} catch (error) {
		console.error('Switch tenant error:', error);
		return NextResponse.json({ error: 'Failed to switch tenant' }, { status: 500 });
	}
}