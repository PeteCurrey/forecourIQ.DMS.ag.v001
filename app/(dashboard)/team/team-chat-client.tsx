'use client';

import { useEffect, useState, useRef } from 'react';
import { InternalMessage, InternalThread } from '@/lib/types/chat';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn, getInitials } from '@/lib/utils';
import { 
  Hash, 
  User, 
  Car, 
  Send, 
  Paperclip, 
  ChevronRight, 
  Users, 
  MessageSquare,
  Search,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

interface TeamChatClientProps {
  initialThreads: InternalThread[];
  currentUserId: string;
  dealershipId: string;
}

export default function TeamChatClient({
  initialThreads,
  currentUserId,
  dealershipId,
}: TeamChatClientProps) {
  const supabase = createClient();
  const [threads, setThreads] = useState<InternalThread[]>(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string>(
    initialThreads[0]?.id || ''
  );
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find(t => t.id === selectedThreadId);

  // 1. Fetch messages when selected thread changes
  useEffect(() => {
    if (!selectedThreadId) return;

    async function loadThreadMessages() {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/team/threads/${selectedThreadId}/messages`);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadThreadMessages();
  }, [selectedThreadId]);

  // 2. Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Supabase Realtime Subscription for new internal messages
  useEffect(() => {
    if (!selectedThreadId) return;

    const channel = supabase
      .channel(`team_thread_${selectedThreadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
          filter: `thread_id=eq.${selectedThreadId}`,
        },
        async (payload) => {
          // Re-fetch or append
          const res = await fetch(`/api/team/threads/${selectedThreadId}/messages`);
          const data = await res.json();
          if (data.messages) setMessages(data.messages);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedThreadId, supabase]);

  // Handle message sending
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || !selectedThreadId || sending) return;

    setSending(true);
    const bodyText = messageInput.trim();
    setMessageInput('');

    try {
      const res = await fetch(`/api/team/threads/${selectedThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyText }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  // Filter threads by search
  const filteredThreads = threads.filter(t => {
    const name = t.name || t.entity_summary?.title || 'Thread';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const channels = filteredThreads.filter(t => t.type === 'channel');
  const directMessages = filteredThreads.filter(t => t.type === 'direct');
  const entityThreads = filteredThreads.filter(t => t.type === 'entity');

  return (
    <div className="bg-carbon border border-steel rounded-xl overflow-hidden flex h-[calc(100vh-140px)] reveal-1">
      
      {/* 1. Left Column: Threads Navigation (w-72) */}
      <div className="w-72 border-r border-steel bg-carbon flex flex-col shrink-0">
        
        {/* Search Header */}
        <div className="p-3.5 border-b border-steel">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-pewter absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-asphalt border border-steel rounded-md pl-8 pr-3 py-1.5 text-xs text-cream placeholder:text-pewter focus:outline-none"
            />
          </div>
        </div>

        {/* Thread Lists */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          
          {/* Channels */}
          <div>
            <div className="px-2 mb-1.5 text-[10px] font-sans font-medium uppercase tracking-wider text-pewter">
              Channels
            </div>
            <div className="space-y-0.5">
              {channels.map((ch) => {
                const isActive = ch.id === selectedThreadId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedThreadId(ch.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left',
                      isActive
                        ? 'bg-asphalt text-cream font-semibold'
                        : 'text-pewter hover:text-cream hover:bg-asphalt/50'
                    )}
                  >
                    <Hash className="w-3.5 h-3.5 text-pewter shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Entity Discussions */}
          {entityThreads.length > 0 && (
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-sans font-medium uppercase tracking-wider text-pewter">
                Records & Stock
              </div>
              <div className="space-y-0.5">
                {entityThreads.map((th) => {
                  const isActive = th.id === selectedThreadId;
                  return (
                    <button
                      key={th.id}
                      onClick={() => setSelectedThreadId(th.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left',
                        isActive
                          ? 'bg-asphalt text-cream font-semibold'
                          : 'text-pewter hover:text-cream hover:bg-asphalt/50'
                      )}
                    >
                      <Car className="w-3.5 h-3.5 text-pewter shrink-0" />
                      <span className="truncate">{th.name || th.entity_summary?.title || 'Entity'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Messages */}
          {directMessages.length > 0 && (
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-sans font-medium uppercase tracking-wider text-pewter">
                Direct Messages
              </div>
              <div className="space-y-0.5">
                {directMessages.map((dm) => {
                  const otherMember = dm.members?.find(m => m.user_id !== currentUserId)?.user;
                  const name = otherMember?.full_name || 'Team Member';
                  const isActive = dm.id === selectedThreadId;

                  return (
                    <button
                      key={dm.id}
                      onClick={() => setSelectedThreadId(dm.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left',
                        isActive
                          ? 'bg-asphalt text-cream font-semibold'
                          : 'text-pewter hover:text-cream hover:bg-asphalt/50'
                      )}
                    >
                      <div className="w-4 h-4 rounded-full bg-steel flex items-center justify-center text-[9px] font-bold text-cream shrink-0">
                        {getInitials(name)}
                      </div>
                      <span className="truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2. Middle Column: Active Conversation (flex-1) */}
      <div className="flex-1 flex flex-col min-w-0 bg-void">
        
        {/* Thread Header */}
        <div className="h-14 px-6 border-b border-steel bg-carbon flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {activeThread?.type === 'channel' ? (
              <Hash className="w-4 h-4 text-pewter" />
            ) : activeThread?.type === 'entity' ? (
              <Car className="w-4 h-4 text-pewter" />
            ) : (
              <User className="w-4 h-4 text-pewter" />
            )}
            <div>
              <h2 className="text-sm font-semibold text-cream">
                {activeThread?.name || activeThread?.entity_summary?.title || 'Team Conversation'}
              </h2>
              {activeThread?.entity_summary?.subtitle && (
                <p className="text-[11px] text-pewter">{activeThread.entity_summary.subtitle}</p>
              )}
            </div>
          </div>

          {activeThread?.entity_summary?.linkUrl && (
            <Link
              href={activeThread.entity_summary.linkUrl}
              className="text-xs text-pewter hover:text-cream flex items-center gap-1 underline"
            >
              <span>View Record</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingMessages ? (
            <div className="text-center py-20 text-xs text-pewter">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-xs text-pewter space-y-1">
              <p className="font-medium text-cream">No messages in this thread yet.</p>
              <p>Start the conversation with your team.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_user_id === currentUserId;
              const senderName = msg.sender?.full_name || 'Team Member';
              const timeStr = new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={msg.id} className="flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-full bg-carbon border border-steel flex items-center justify-center font-bold text-[10px] text-cream shrink-0 mt-0.5">
                    {getInitials(senderName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-cream">{senderName}</span>
                      <span className="text-[10px] text-pewter font-mono">{timeStr}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-carbon border border-steel text-cream leading-relaxed inline-block max-w-2xl">
                      {msg.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="p-4 border-t border-steel bg-carbon">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              placeholder={`Message ${activeThread?.name ? `#${activeThread.name}` : 'team'}...`}
              className="flex-1 bg-void border border-steel rounded-md px-3.5 py-2 text-xs text-cream placeholder:text-pewter focus:outline-none"
            />
            <Button
              type="submit"
              disabled={sending || !messageInput.trim()}
              className="bg-cream text-void hover:bg-cream/90 text-xs px-3 h-8"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>

      </div>

      {/* 3. Right Column: Entity Context Panel (w-72 if entity thread) */}
      {activeThread?.entity_summary && (
        <div className="w-72 border-l border-steel bg-carbon p-5 space-y-4 shrink-0 hidden lg:block">
          <div className="text-[11px] font-sans font-medium uppercase tracking-wider text-pewter">
            Linked Record Context
          </div>

          <div className="border border-steel rounded-lg overflow-hidden bg-asphalt/50">
            {activeThread.entity_summary.imageUrl ? (
              <img
                src={activeThread.entity_summary.imageUrl}
                alt=""
                className="w-full h-36 object-cover"
              />
            ) : (
              <div className="w-full h-24 bg-asphalt flex items-center justify-center">
                <Car className="w-6 h-6 text-pewter" />
              </div>
            )}
            <div className="p-3 space-y-1">
              <div className="font-semibold text-xs text-cream">{activeThread.entity_summary.title}</div>
              {activeThread.entity_summary.subtitle && (
                <div className="font-mono text-[11px] text-pewter">{activeThread.entity_summary.subtitle}</div>
              )}
              {activeThread.entity_summary.price && (
                <div className="text-xs font-semibold text-cream tabular-nums pt-1">
                  £{activeThread.entity_summary.price.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <Link href={activeThread.entity_summary.linkUrl}>
            <Button variant="outline" className="w-full text-xs">
              Open Full Record →
            </Button>
          </Link>
        </div>
      )}

    </div>
  );
}
