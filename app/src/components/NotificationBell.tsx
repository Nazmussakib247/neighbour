import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { fetchNotifications, markAllNotificationsRead, type Notification } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const POLL_MS = 30000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso.replace(' ', 'T')).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false); // backend reachable
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const res = await fetchNotifications();
    if (res) {
      setItems(res.items);
      setUnread(res.unread);
      setAvailable(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    timerRef.current = setInterval(load, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, load]);

  if (!user || !available) return null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((its) => its.map((n) => ({ ...n, read: true })));
      markAllNotificationsRead();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F3EDE5] transition-colors duration-200"
        aria-label="Notifications"
      >
        <Bell size={20} strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[54]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-[55] w-[340px] max-w-[90vw] bg-white rounded-2xl border border-[rgba(26,26,26,0.08)] shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(26,26,26,0.06)]">
              <p className="text-sm font-semibold text-[#1A1A1A]">Notifications</p>
            </div>
            <div data-lenis-prevent className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#8B7E74]">
                  No notifications yet
                </p>
              ) : (
                items.map((n) => {
                  const inner = (
                    <div className={`px-4 py-3 border-b border-[rgba(26,26,26,0.04)] hover:bg-[#FFF5EE] transition-colors ${!n.read ? 'bg-[#FFF5EE]/60' : ''}`}>
                      <p className="text-sm text-[#1A1A1A] leading-snug">{n.message}</p>
                      <p className="text-xs text-[#8B7E74] mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} to={n.link} onClick={() => setOpen(false)} className="block">
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
