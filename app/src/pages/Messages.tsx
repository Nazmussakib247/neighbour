import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Send, ArrowLeft, MessageSquare } from 'lucide-react';
import {
  fetchConversations, fetchThread, sendMessage,
  type Conversation, type ChatThread, ApiError,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [input, setInput] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login', { replace: true, state: { from: '/messages' } });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadConvos = useCallback(async () => {
    const data = await fetchConversations();
    setConversations(data ?? []);
    setLoadingConvos(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadConvos();
  }, [user, loadConvos]);

  // Open a specific conversation from ?to= / ?with= (e.g. profile "Contact Me")
  useEffect(() => {
    const to = searchParams.get('to') || searchParams.get('with');
    if (to) setSelectedId(Number(to));
  }, [searchParams]);

  const loadThread = useCallback(async (uid: number) => {
    setLoadingThread(true);
    const data = await fetchThread(uid);
    setThread(data);
    setLoadingThread(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const openConversation = (uid: number) => {
    setSelectedId(uid);
    setSearchParams({ with: String(uid) }, { replace: true });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selectedId) return;
    setSending(true);
    try {
      await sendMessage(selectedId, text);
      setInput('');
      await loadThread(selectedId);
      await loadConvos();
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white pt-[72px] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-[72px] page-enter">
      <div className="max-w-[1100px] mx-auto px-6 pt-10 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-2">
          <Link to="/" className="hover:text-[#FF6B35]">Home</Link> / Messages
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          Messages
        </h1>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 pb-16">
        <div className="flex border border-[rgba(26,26,26,0.1)] rounded-2xl overflow-hidden h-[600px] bg-white">
          {/* Conversation list */}
          <aside className={`w-full md:w-[320px] md:border-r border-[rgba(26,26,26,0.08)] overflow-y-auto ${selectedId ? 'hidden md:block' : 'block'}`}>
            {loadingConvos ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#8B7E74] mt-10">
                No conversations yet. Message a professional from their profile to start one.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.userId}
                  onClick={() => openConversation(c.userId)}
                  className={`w-full flex items-center gap-3 p-4 text-left border-b border-[rgba(26,26,26,0.05)] transition-colors ${selectedId === c.userId ? 'bg-[#FFF5EE]' : 'hover:bg-[#FAF6F0]'}`}>
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-11 h-11 rounded-full bg-[#F3EDE5] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {initials(c.name)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1A1A1A] truncate">{c.name}</p>
                      {c.unread > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-[#FF6B35] text-white text-[11px] font-semibold rounded-full flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8B7E74] truncate">{c.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </aside>

          {/* Thread */}
          <section className={`flex-1 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
            {!selectedId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <MessageSquare size={48} className="text-[#8B7E74] mb-3" />
                <p className="text-sm text-[#8B7E74]">Select a conversation to view messages.</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 p-4 border-b border-[rgba(26,26,26,0.08)]">
                  <button onClick={() => { setSelectedId(null); setThread(null); }} className="md:hidden text-[#8B7E74] hover:text-[#FF6B35]">
                    <ArrowLeft size={20} />
                  </button>
                  {thread?.user.avatar ? (
                    <img src={thread.user.avatar} alt={thread.user.full_name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-[#F3EDE5] flex items-center justify-center text-xs font-semibold">
                      {thread ? initials(thread.user.full_name) : '…'}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{thread?.user.full_name ?? 'Loading…'}</p>
                    {thread && <p className="text-xs text-[#8B7E74] capitalize">{thread.user.role}</p>}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FEFCFA]">
                  {loadingThread ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
                    </div>
                  ) : thread && thread.messages.length > 0 ? (
                    thread.messages.map((m) => {
                      const mine = m.senderId === user.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${mine ? 'bg-[#FF6B35] text-white rounded-br-sm' : 'bg-white border border-[rgba(26,26,26,0.08)] text-[#1A1A1A] rounded-bl-sm'}`}>
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-[#A39B92]'}`}>{timeLabel(m.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-[#8B7E74]">
                      No messages yet — say hello 👋
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {/* Composer */}
                <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-[rgba(26,26,26,0.08)]">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 px-4 py-2.5 bg-[#F3EDE5] rounded-full text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="w-10 h-10 flex items-center justify-center bg-[#1A1A1A] text-white rounded-full hover:bg-[#FF6B35] transition-colors disabled:opacity-50 flex-shrink-0">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-[90] max-w-[400px] bg-white rounded-2xl shadow-lg p-4 border-l-4 border-[#FF6B35]">
          <p className="text-sm text-[#1A1A1A]">{toast}</p>
        </div>
      )}
    </div>
  );
}
