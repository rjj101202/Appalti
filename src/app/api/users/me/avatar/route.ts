import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { put } from '@vercel/blob';
import { getUserRepository } from '@/lib/db/repositories/userRepository';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request);
		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('multipart/form-data')) {
			return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
		}
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) {
			return NextResponse.json({ error: 'file is required' }, { status: 400 });
		}
		const filename = `avatars/${auth.userId}-${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._/-]/g, '_');
		const blob = await put(filename, file, { access: 'public' });
		const userRepo = await getUserRepository();
		await userRepo.update(auth.userId, { avatar: blob.url });
		return NextResponse.json({ success: true, url: blob.url });
	} catch (e) {
		console.error('Avatar upload error:', e);
		return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
	}
}