import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runSingleQuery, runWriteQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as Record<string, unknown>)?.id as string | undefined;

    const result = await runSingleQuery<Record<string, unknown>>(
      `MATCH (u:User {id: $id})
       OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
       OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
       OPTIONAL MATCH (u)-[:CREATED]->(p:Post)
       OPTIONAL MATCH (me:User {id: $currentUserId})-[f:FOLLOWS]->(u)
       OPTIONAL MATCH (me2:User {id: $currentUserId})-[b:BLOCKED]->(u)
       OPTIONAL MATCH (u)-[fb:FOLLOWS]->(me3:User {id: $currentUserId})
       RETURN u,
         COUNT(DISTINCT follower) AS followersCount,
         COUNT(DISTINCT following) AS followingCount,
         COUNT(DISTINCT p) AS postsCount,
         f IS NOT NULL AS isFollowing,
         b IS NOT NULL AS isBlocked,
         fb IS NOT NULL AS isFollowedBy`,
      { id, currentUserId: currentUserId || '' }
    );

    if (!result) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result.u as Record<string, unknown>;
    delete user.password;

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        followersCount: result.followersCount,
        followingCount: result.followingCount,
        postsCount: result.postsCount,
        isFollowing: result.isFollowing,
        isBlocked: result.isBlocked,
        isFollowedBy: result.isFollowedBy,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as Record<string, unknown>)?.id as string;

    if (currentUserId !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, bio, website, location, dob, avatar, coverPhoto, privacy } = body;

    await runWriteQuery(
      `MATCH (u:User {id: $id})
       SET u.name = COALESCE($name, u.name),
           u.bio = COALESCE($bio, u.bio),
           u.website = COALESCE($website, u.website),
           u.location = COALESCE($location, u.location),
           u.dob = COALESCE($dob, u.dob),
           u.avatar = COALESCE($avatar, u.avatar),
           u.coverPhoto = COALESCE($coverPhoto, u.coverPhoto),
           u.privacy = COALESCE($privacy, u.privacy),
           u.updatedAt = datetime()`,
      { id, name, bio, website, location, dob, avatar, coverPhoto, privacy }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as Record<string, unknown>)?.id as string;

    if (currentUserId !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await runWriteQuery('MATCH (u:User {id: $id}) DETACH DELETE u', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
