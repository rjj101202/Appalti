import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getUserRepository } from '@/lib/db/repositories/userRepository';
import { z } from 'zod';

const updateSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	image: z.string().url().max(512).optional()
}).refine(d => Object.keys(d).length > 0, { message: 'No fields to update' });

export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request);
		const userRepo = await getUserRepository();
		const user = await userRepo.findById(auth.userId);
		if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
		return NextResponse.json({
			success: true,
			data: {
				id: user._id?.toString(),
				name: user.name,
				email: user.email,
				image: user.avatar || user.image,
				companyRole: auth.companyRole,
				platformRole: auth.platformRole,
				tenantId: auth.tenantId,
				companyId: auth.companyId
			}
		});
	} catch (e) {
		return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	try {
		const auth = await requireAuth(request);
		const body = await request.json();
		const parsed = updateSchema.safeParse(body);
		if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
		const userRepo = await getUserRepository();
		const updated = await userRepo.update(auth.userId, {
			name: parsed.data.name,
			avatar: parsed.data.image
		});
		if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
		return NextResponse.json({ success: true });
	} catch (e) {
		return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
	}
}