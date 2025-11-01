import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // The problem: two user IDs
    const sessionUserId = '689d9508d8a8de866d28cfc8'; // NextAuth uses this
    const avatarUserId = '689d950dd8a8de866d28cfcb';   // Avatar uploads go here
    
    // 1. Get avatar from avatarUser
    const avatarUser = await db.collection('users').findOne({ _id: new ObjectId(avatarUserId) });
    console.log('[Fix] Avatar user avatar:', avatarUser?.avatar);
    
    if (!avatarUser?.avatar) {
      return NextResponse.json({ error: 'No avatar on source user' }, { status: 404 });
    }
    
    // 2. Copy avatar to sessionUser
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(sessionUserId) },
      { 
        $set: { 
          avatar: avatarUser.avatar,
          image: avatarUser.avatar
        } 
      }
    );
    
    console.log('[Fix] Copied avatar to session user, modified:', result.modifiedCount);
    
    return NextResponse.json({
      success: true,
      message: 'Avatar copied successfully',
      avatarUrl: avatarUser.avatar,
      modified: result.modifiedCount,
      info: 'Please logout and login to see the avatar'
    });
    
  } catch (e: any) {
    console.error('[Fix] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

