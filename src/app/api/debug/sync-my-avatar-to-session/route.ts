import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const db = await getDatabase();
    
    // Get avatar from our custom users collection
    const customUser = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) });
    
    if (!customUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const avatarUrl = customUser.avatar;
    
    if (!avatarUrl) {
      return NextResponse.json({ 
        success: true, 
        message: 'No custom avatar found in database' 
      });
    }
    
    // Update the image field (used by NextAuth session)
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(auth.userId) },
      { $set: { image: avatarUrl } }
    );
    
    console.log(`[Sync Avatar] Updated session image for user ${auth.userId}: ${avatarUrl}`);
    
    return NextResponse.json({
      success: true,
      message: 'Avatar synced to session',
      avatarUrl,
      modified: result.modifiedCount
    });
    
  } catch (e: any) {
    console.error('[Sync Avatar] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

