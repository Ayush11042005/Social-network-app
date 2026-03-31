import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPusherServer } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const formData = await req.formData();
    const socketId = formData.get('socket_id') as string;
    const channel = formData.get('channel_name') as string;

    const userId = (session.user as Record<string, unknown>).id as string;
    const userName = session.user.name || '';

    const pusher = getPusherServer();

    if (channel.startsWith('presence-')) {
      const presenceData = {
        user_id: userId,
        user_info: { name: userName, image: session.user.image },
      };
      const auth = pusher.authorizeChannel(socketId, channel, presenceData);
      return NextResponse.json(auth);
    }

    const auth = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(auth);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
