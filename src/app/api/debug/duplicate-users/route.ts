import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const db = await getDatabase();
    
    console.log('[Debug] Auth userId:', auth.userId);
    
    // Find current user by ObjectId
    const currentUser = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) });
    console.log('[Debug] Current user found:', !!currentUser);
    
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Current user not found',
        debug: { userId: auth.userId, email: auth.email }
      }, { status: 404 });
    }

    // Find all users with the same email
    const duplicates = await db.collection('users')
      .find({ email: currentUser.email })
      .toArray();

    console.log('[Debug] Found users with email:', duplicates.length);

    return NextResponse.json({
      success: true,
      data: {
        currentSessionUserId: auth.userId,
        email: currentUser.email,
        totalUsersWithEmail: duplicates.length,
        users: duplicates.map((u: any) => ({
          _id: u._id.toString(),
          auth0Id: u.auth0Id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          createdAt: u.createdAt,
          hasAvatar: !!u.avatar,
          isCurrentSessionUser: u._id.toString() === auth.userId
        }))
      }
    });
  } catch (e: any) {
    console.error('Debug duplicate users error:', e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const db = await getDatabase();
    
    const currentUser = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Find other users with same email that have avatar
    const duplicates = await db.collection('users')
      .find({ 
        email: currentUser.email,
        _id: { $ne: new ObjectId(auth.userId) },
        avatar: { $exists: true, $ne: null, $ne: '' }
      })
      .toArray();

    if (duplicates.length === 0) {
      return NextResponse.json({ success: true, message: 'No duplicates with avatar found' });
    }

    // Take avatar from first duplicate
    const avatarUrl = duplicates[0].avatar;
    
    // Copy to current session user
    await db.collection('users').updateOne(
      { _id: new ObjectId(auth.userId) },
      { $set: { avatar: avatarUrl, updatedAt: new Date() } }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Avatar copied successfully',
      avatarUrl
    });
  } catch (e: any) {
    console.error('Merge duplicates error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
