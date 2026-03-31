'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MoveLeft, Send, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getPusherClient, channels, events } from '@/lib/pusher';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function ChatViewPage() {
  const { data: session } = useSession();
  const userId = (session?.user as Record<string, unknown>)?.id as string;
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/messages/${conversationId}`);
        if (!res.ok) throw new Error('Forbidden');
        const data = await res.json();
        setMessages(data.data || []);
      } catch {
        router.push('/messages');
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [conversationId, router]);

  useEffect(() => {
    if (!conversationId) return;
    const pusher = getPusherClient();
    const channelName = channels.conversation(conversationId);
    
    // Unbind and rebind to prevent duplicates if mounted multiple times
    pusher.unsubscribe(channelName);
    const channel = pusher.subscribe(channelName);

    channel.bind(events.NEW_MESSAGE, (newMsg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [conversationId]);

  useEffect(() => {
    // Determine target based on scrolling behavior wanted.
    // For now, auto scroll to bottom when messages update
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      content: inputText,
      senderId: userId,
      createdAt: new Date().toISOString(),
      sender: {
        id: userId,
        name: session?.user?.name || 'Me',
        avatar: session?.user?.image || '',
      },
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputText('');
    setSending(true);

    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tempMsg.content }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data.data : m)));
      }
    } catch {
      // Revert if failed
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = () => {
    if (messages.length === 0) return null;
    const otherMsg = messages.find((m) => m.senderId !== userId);
    return otherMsg?.sender || null;
  };

  const partnerInfo = getOtherParticipant();

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] xl:h-screen w-full lg:max-w-[700px] xl:max-w-none bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur z-10 sticky top-0 shrink-0">
        <Link href="/messages" className="md:hidden p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground mr-1">
          <MoveLeft className="w-5 h-5" />
        </Link>
        {loading ? (
          <>
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <Avatar className="w-10 h-10 ring-2 ring-violet-500/20">
              <AvatarImage src={partnerInfo?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                {partnerInfo?.name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm leading-none">{partnerInfo?.name || 'Conversation'}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-[250px]' : 'w-[180px]'}`} />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === userId;
            const showAvatar = !isMe && (i === messages.length - 1 || messages[i + 1]?.senderId === userId);

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 shrink-0 flex items-end">
                    {showAvatar && (
                      <Avatar className="w-8 h-8 ring-1 ring-border shadow-sm">
                        <AvatarImage src={msg.sender?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[10px]">
                          {msg.sender?.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  <div
                    className={`px-4 py-2 text-sm max-w-full break-words shadow-sm ${
                      isMe
                        ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-2xl rounded-tl-sm border border-border/50'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {format(new Date(msg.createdAt), 'p')}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 bg-card border-t border-border mt-auto shrink-0 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10 rounded-full"
        >
          <ImageIcon className="w-5 h-5" />
        </Button>
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-full bg-muted border-none focus-visible:ring-1 focus-visible:ring-violet-500 h-10 px-4"
        />
        <Button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="shrink-0 rounded-full h-10 px-4 flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
}
