import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getUserRepository } from '@/lib/db/repositories/userRepository';
import { z } from 'zod';

const updateSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	image: z.string().url().max(512).optional(),
	avatar: z.string().url().max(512).optional(),
	phoneNumber: z.string().optional(),
	metadata: z.object({
		jobTitle: z.string().optional(),
		bio: z.string().optional()
	}).optional()
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
				_id: user._id?.toString(),
				id: user._id?.toString(),
				name: user.name,
				email: user.email,
				avatar: user.avatar,
				image: user.avatar, // Backwards compatibility
				phoneNumber: user.phoneNumber,
				metadata: user.metadata,
				companyRole: auth.companyRole,
				platformRole: auth.platformRole,
				tenantId: auth.tenantId,
				companyId: auth.companyId
			}
		});
	} catch (e) {
		console.error('[GET /api/users/me] Error:', e);
		return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	try {
		const auth = await requireAuth(request);
		const body = await request.json();
		console.log('[PUT /api/users/me] Body:', body);
		const parsed = updateSchema.safeParse(body);
		if (!parsed.success) {
			console.error('[PUT /api/users/me] Validation failed:', parsed.error.issues);
			return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
		}
		
		const userRepo = await getUserRepository();
		
		// Build update object - support both image and avatar fields
		const updateData: any = {};
		if (parsed.data.name) updateData.name = parsed.data.name;
		if (parsed.data.image) updateData.avatar = parsed.data.image;
		if (parsed.data.avatar) updateData.avatar = parsed.data.avatar;
		if (parsed.data.phoneNumber !== undefined) updateData.phoneNumber = parsed.data.phoneNumber;
		if (parsed.data.metadata) updateData.metadata = parsed.data.metadata;
		
		console.log('[PUT /api/users/me] Updating user with:', updateData);
		const updated = await userRepo.update(auth.userId, updateData);
		if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
		
		return NextResponse.json({ success: true, data: updated });
	} catch (e) {
		console.error('[PUT /api/users/me] Error:', e);
		return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
	}
}