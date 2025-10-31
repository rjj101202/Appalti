import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { put } from '@vercel/blob';
import { getUserRepository } from '@/lib/db/repositories/userRepository';

// Use node runtime because this route imports MongoDB repositories
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request);
		console.log('[Avatar Upload] User ID:', auth.userId);
		
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
		console.log('[Avatar Upload] Uploading to Blob:', filename);
		
		const blob = await put(filename, file, { access: 'public' });
		console.log('[Avatar Upload] Blob URL:', blob.url);
		
		const userRepo = await getUserRepository();
		const updateResult = await userRepo.update(auth.userId, { avatar: blob.url });
		console.log('[Avatar Upload] Database update result:', updateResult ? 'SUCCESS' : 'FAILED');
		
		if (!updateResult) {
			console.error('[Avatar Upload] Database update returned null');
			return NextResponse.json({ error: 'Failed to save avatar to database' }, { status: 500 });
		}
		
		console.log('[Avatar Upload] Final user avatar:', updateResult.avatar);
		return NextResponse.json({ success: true, url: blob.url });
	} catch (e) {
		console.error('[Avatar Upload] Error:', e);
		return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
	}
}