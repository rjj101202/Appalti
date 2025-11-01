import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Known duplicate user IDs for rjager@appalti.nl
    const sessionUserId = '689d9508d8a8de866d28cfc8'; // NextAuth session user
    const avatarUserId = '689d950dd8a8de866d28cfcb';   // User with avatar
    
    // Get both users
    const [sessionUser, avatarUser] = await Promise.all([
      db.collection('users').findOne({ _id: new ObjectId(sessionUserId) }),
      db.collection('users').findOne({ _id: new ObjectId(avatarUserId) })
    ]);
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Session user not found' }, { status: 404 });
    }
    
    if (!avatarUser) {
      return NextResponse.json({ error: 'Avatar user not found' }, { status: 404 });
    }
    
    console.log('[Merge] Session user avatar before:', sessionUser.avatar);
    console.log('[Merge] Avatar user avatar:', avatarUser.avatar);
    
    // Copy avatar to session user
    const avatarUrl = avatarUser.avatar || sessionUser.avatar;
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(sessionUserId) },
      { 
        $set: { 
          avatar: avatarUrl,
          image: avatarUrl,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('[Merge] Update result:', result.modifiedCount, 'modified');
    
    // Verify
    const verified = await db.collection('users').findOne({ _id: new ObjectId(sessionUserId) });
    console.log('[Merge] Session user avatar after:', verified?.avatar);
    console.log('[Merge] Session user image after:', verified?.image);
    
    return NextResponse.json({
      success: true,
      message: 'Avatar merged successfully',
      sessionUserId,
      avatarUserId,
      avatarUrl,
      before: {
        sessionUserAvatar: sessionUser.avatar,
        sessionUserImage: sessionUser.image
      },
      after: {
        sessionUserAvatar: verified?.avatar,
        sessionUserImage: verified?.image
      },
      modified: result.modifiedCount
    });
    
  } catch (e: any) {
    console.error('[Merge] Error:', e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

