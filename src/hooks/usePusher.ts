'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getPusherClient, channels, events } from '@/lib/pusher';
import type PusherClient from 'pusher-js';
import type { Channel } from 'pusher-js';

export function usePusher(userId?: string) {
  const clientRef = useRef<PusherClient | null>(null);
  const channelsRef = useRef<Map<string, Channel>>(new Map());

  useEffect(() => {
    if (!userId) return;
    clientRef.current = getPusherClient();

    return () => {
      channelsRef.current.forEach((_, name) => {
        clientRef.current?.unsubscribe(name);
      });
      channelsRef.current.clear();
    };
  }, [userId]);

  const subscribe = useCallback((channelName: string, event: string, callback: (data: unknown) => void) => {
    if (!clientRef.current) return;

    let channel = channelsRef.current.get(channelName);
    if (!channel) {
      channel = clientRef.current.subscribe(channelName);
      channelsRef.current.set(channelName, channel);
    }
    channel.bind(event, callback);

    return () => {
      channel?.unbind(event, callback);
    };
  }, []);

  const subscribeToNotifications = useCallback(
    (callback: (data: unknown) => void) => {
      if (!userId) return;
      return subscribe(channels.notifications(userId), events.NEW_NOTIFICATION, callback);
    },
    [userId, subscribe]
  );

  const subscribeToConversation = useCallback(
    (conversationId: string, callback: (data: unknown) => void) => {
      return subscribe(channels.conversation(conversationId), events.NEW_MESSAGE, callback);
    },
    [subscribe]
  );

  const subscribeToTyping = useCallback(
    (conversationId: string, callback: (data: unknown) => void) => {
      return subscribe(channels.conversation(conversationId), events.TYPING, callback);
    },
    [subscribe]
  );

  return {
    subscribe,
    subscribeToNotifications,
    subscribeToConversation,
    subscribeToTyping,
  };
}
