import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    // Suggested content by interest + collaborative filtering
    const results = await runQuery(
      `MATCH (me:User {id: $userId})-[:LIKES|REACTED]->(:Post)-[:HAS_TAG]->(t:Hashtag)
       WITH me, t, COUNT(*) AS interest ORDER BY interest DESC LIMIT 5
       MATCH (t)<-[:HAS_TAG]-(rec:Post)<-[:CREATED]-(author:User)
       WHERE NOT (me)-[:LIKES]->(rec) AND rec.visibility = 'public'
       OPTIONAL MATCH (rec)<-[r:REACTED]-()
       RETURN DISTINCT rec, author, COUNT(r) AS engagement
       ORDER BY engagement DESC LIMIT 15`,
      { userId }
    );

    const posts = results.map((r) => {
      const author = r.author as Record<string, unknown>;
      delete author.password;
      return {
        ...(r.rec as Record<string, unknown>),
        author,
        likesCount: r.engagement,
        images: (r.rec as Record<string, unknown>).images || [],
      };
    });

    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('Post recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
