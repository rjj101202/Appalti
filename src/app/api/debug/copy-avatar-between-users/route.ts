import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    
    if (!(auth as any).isAppaltiUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDatabase();
    
    // The two user IDs we've identified
    const sessionUserId = '689d9508d8a8de866d28cfc8'; // Used in sessions, NO avatar
    const avatarUserId = '689d950dd8a8de866d28cfcb';   // Has the avatar
    
    // Get avatar from the user that has it
    const userWithAvatar = await db.collection('users').findOne({ 
      _id: new ObjectId(avatarUserId) 
    });
    
    if (!userWithAvatar?.avatar) {
      return NextResponse.json({ 
        error: 'No avatar found on source user',
        sourceUserId: avatarUserId
      }, { status: 404 });
    }
    
    console.log('[Copy Avatar] Avatar URL:', userWithAvatar.avatar);
    
    // Copy avatar to session user
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(sessionUserId) },
      { $set: { avatar: userWithAvatar.avatar, image: userWithAvatar.avatar } }
    );
    
    console.log('[Copy Avatar] Update result:', {
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
    
    return NextResponse.json({
      success: true,
      message: 'Avatar copied to session user',
      from: avatarUserId,
      to: sessionUserId,
      avatarUrl: userWithAvatar.avatar,
      modified: result.modifiedCount
    });
    
  } catch (e: any) {
    console.error('[Copy Avatar] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

