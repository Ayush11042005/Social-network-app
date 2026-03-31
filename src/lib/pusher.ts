import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance (singleton)
let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServer;
}

// Client-side Pusher instance (singleton)
let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return pusherClient;
}

// Channel name helpers
export const channels = {
  user: (userId: string) => `private-user-${userId}`,
  conversation: (convId: string) => `private-conversation-${convId}`,
  presence: () => 'presence-online',
  post: (postId: string) => `post-${postId}`,
  notifications: (userId: string) => `private-notifications-${userId}`,
};

// Event name helpers
export const events = {
  NEW_MESSAGE: 'new-message',
  TYPING: 'client-typing',
  STOP_TYPING: 'client-stop-typing',
  MESSAGE_SEEN: 'message-seen',
  NEW_NOTIFICATION: 'new-notification',
  POST_LIKED: 'post-liked',
  POST_COMMENTED: 'post-commented',
  PRESENCE_UPDATE: 'presence-update',
  NEW_REACTION: 'new-reaction',
};
