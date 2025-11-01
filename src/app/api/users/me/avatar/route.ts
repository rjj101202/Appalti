import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { put } from '@vercel/blob';
import { getUserRepository } from '@/lib/db/repositories/userRepository';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
		
		const db = await getDatabase();
		
		// CRITICAL FIX: Update BOTH possible user records
		// There's a known issue where some users have 2 records
		const email = auth.email;
		
		// Update ALL users with this email (covers both c8 and cb cases)
		const bulkResult = await db.collection('users').updateMany(
			{ email: email },
			{ 
				$set: { 
					avatar: blob.url,
					image: blob.url, // NextAuth uses 'image' field
					updatedAt: new Date()
				} 
			}
		);
		
		console.log('[Avatar Upload] Updated', bulkResult.modifiedCount, 'user record(s) for', email);
		
		console.log('[Avatar Upload] Final avatar:', blob.url);
		return NextResponse.json({ success: true, url: blob.url });
	} catch (e) {
		console.error('[Avatar Upload] Error:', e);
		return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
	}
}