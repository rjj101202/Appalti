import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    const sessionUserId = '689d9508d8a8de866d28cfc8';
    const avatarUserId = '689d950dd8a8de866d28cfcb';
    
    // Check both users exist
    const [sessionUser, avatarUser] = await Promise.all([
      db.collection('users').findOne({ _id: new ObjectId(sessionUserId) }),
      db.collection('users').findOne({ _id: new ObjectId(avatarUserId) })
    ]);
    
    console.log('[Force Fix] Session user exists:', !!sessionUser);
    console.log('[Force Fix] Avatar user exists:', !!avatarUser);
    console.log('[Force Fix] Avatar user avatar:', avatarUser?.avatar);
    console.log('[Force Fix] Session user current avatar:', sessionUser?.avatar);
    console.log('[Force Fix] Session user current image:', sessionUser?.image);
    
    if (!avatarUser?.avatar) {
      return NextResponse.json({ error: 'Avatar user has no avatar' }, { status: 404 });
    }
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Session user not found' }, { status: 404 });
    }
    
    // Force update with $set
    const avatarUrl = avatarUser.avatar;
    const updateResult = await db.collection('users').updateOne(
      { _id: new ObjectId(sessionUserId) },
      { 
        $set: { 
          avatar: avatarUrl,
          image: avatarUrl,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('[Force Fix] Update result:', {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });
    
    // Verify update
    const updated = await db.collection('users').findOne({ _id: new ObjectId(sessionUserId) });
    console.log('[Force Fix] After update - avatar:', updated?.avatar);
    console.log('[Force Fix] After update - image:', updated?.image);
    
    return NextResponse.json({
      success: true,
      before: {
        avatar: sessionUser.avatar,
        image: sessionUser.image
      },
      after: {
        avatar: updated?.avatar,
        image: updated?.image
      },
      updateResult: {
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount
      }
    });
    
  } catch (e: any) {
    console.error('[Force Fix] Error:', e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

