import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Megaphone, X } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { useLenis } from '@/hooks/useLenis';

const ANNOUNCEMENT_KEY = 'neighbour_announcement';
const DISMISSED_KEY = 'neighbour_announcement_dismissed';

function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<{ text: string; ts: number } | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(ANNOUNCEMENT_KEY);
        if (!raw) { setAnnouncement(null); return; }
        const parsed = JSON.parse(raw) as { text: string; ts: number };
        const dismissed = localStorage.getItem(DISMISSED_KEY);
        setAnnouncement(dismissed === String(parsed.ts) ? null : parsed);
      } catch {
        setAnnouncement(null);
      }
    };
    read();
    // React to changes from the admin page (other tabs) and on refocus
    window.addEventListener('storage', read);
    window.addEventListener('focus', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('focus', read);
    };
  }, []);

  if (!announcement) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-[#FF6B35] text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-2 flex items-center justify-center gap-3 text-sm">
        <Megaphone size={15} className="flex-shrink-0" />
        <span className="text-center">{announcement.text}</span>
        <button
          aria-label="Dismiss announcement"
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, String(announcement.ts));
            setAnnouncement(null);
          }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const lenisRef = useLenis();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [location.pathname, lenisRef]);

  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="relative">
      {!isAdmin && <AnnouncementBanner />}
      {!isAdmin && <Header />}
      <main>{children}</main>
      {!isAdmin && <Footer />}
    </div>
  );
}
