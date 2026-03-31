import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const filter = searchParams.get('filter') || 'all'; // all, people, posts, hashtags, groups

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: { users: [], posts: [], hashtags: [], groups: [] } });
    }

    const results: Record<string, unknown[]> = { users: [], posts: [], hashtags: [], groups: [] };

    if (filter === 'all' || filter === 'people') {
      const users = await runQuery(
        `MATCH (u:User)
         WHERE toLower(u.name) CONTAINS toLower($q) OR toLower(u.username) CONTAINS toLower($q)
         RETURN u LIMIT 10`,
        { q }
      );
      results.users = users.map((r) => {
        const u = r.u as Record<string, unknown>;
        delete u.password;
        return u;
      });
    }

    if (filter === 'all' || filter === 'posts') {
      const posts = await runQuery(
        `MATCH (author:User)-[:CREATED]->(p:Post)
         WHERE toLower(p.content) CONTAINS toLower($q) AND p.visibility = 'public'
         RETURN p, author LIMIT 10`,
        { q }
      );
      results.posts = posts.map((r) => {
        const a = r.author as Record<string, unknown>;
        delete a.password;
        return { ...(r.p as Record<string, unknown>), author: a };
      });
    }

    if (filter === 'all' || filter === 'hashtags') {
      const tags = await runQuery(
        `MATCH (h:Hashtag)
         WHERE toLower(h.name) CONTAINS toLower($q)
         OPTIONAL MATCH (h)<-[:HAS_TAG]-(p:Post)
         RETURN h.name AS name, COUNT(p) AS postCount LIMIT 10`,
        { q }
      );
      results.hashtags = tags.map((r) => ({ name: r.name, postCount: r.postCount }));
    }

    if (filter === 'all' || filter === 'groups') {
      const groups = await runQuery(
        `MATCH (g:Group)
         WHERE toLower(g.name) CONTAINS toLower($q)
         OPTIONAL MATCH (g)<-[:MEMBER_OF]-(m:User)
         RETURN g, COUNT(m) AS memberCount LIMIT 10`,
        { q }
      );
      results.groups = groups.map((r) => ({ ...(r.g as Record<string, unknown>), memberCount: r.memberCount }));
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
