import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Only allow in development or for Appalti users
    if (process.env.NODE_ENV === 'production') {
      const auth = await requireAuth(request);
      if (!(auth as any).isAppaltiUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const db = await getDatabase();
    const auth = await requireAuth(request);
    
    // Find all users with the same email
    const currentUser = await db.collection('users').findOne({ _id: auth.userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    const duplicates = await db.collection('users')
      .find({ email: currentUser.email })
      .toArray();

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
          hasAvatar: !!u.avatar
        }))
      }
    });
  } catch (e: any) {
    console.error('Debug duplicate users error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Merge duplicate users - copy avatar from newest to session user
    const auth = await requireAuth(request);
    if (!(auth as any).isAppaltiUser && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDatabase();
    const currentUser = await db.collection('users').findOne({ _id: auth.userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Find other users with same email
    const duplicates = await db.collection('users')
      .find({ 
        email: currentUser.email,
        _id: { $ne: auth.userId }
      })
      .toArray();

    if (duplicates.length === 0) {
      return NextResponse.json({ success: true, message: 'No duplicates found' });
    }

    // Find the user with avatar
    const userWithAvatar = duplicates.find((u: any) => u.avatar);
    
    if (userWithAvatar?.avatar) {
      // Copy avatar to current session user
      await db.collection('users').updateOne(
        { _id: auth.userId },
        { $set: { avatar: userWithAvatar.avatar, updatedAt: new Date() } }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Avatar copied from duplicate user',
        avatarUrl: userWithAvatar.avatar
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No avatar found in duplicates'
    });
  } catch (e: any) {
    console.error('Merge duplicates error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

