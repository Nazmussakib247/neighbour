import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, LogOut, LayoutDashboard, User as UserIcon, Heart, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';

const navLinks = [
  { label: 'Services', path: '/services' },
  { label: 'Professionals', path: '/professionals' },
  { label: 'How It Works', path: '/#how-it-works' },
  { label: 'About', path: '/about' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  const isActive = (path: string) => {
    if (path.startsWith('/#')) return false;
    return location.pathname === path;
  };

  const runSearch = (term: string) => {
    const q = term.trim();
    setSearchOpen(false);
    setSearchTerm('');
    navigate(q ? `/services?q=${encodeURIComponent(q)}` : '/services');
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[50] transition-all duration-350"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
          boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(26,26,26,0.06)' : '1px solid transparent',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex flex-col z-10 leading-none">
            <span className="flex items-center gap-1">
              <span className="font-[var(--font-heading)] text-2xl font-bold text-[#1A1A1A] lowercase tracking-tight">
                neighbour
              </span>
              <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="mb-1">
                <path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#FF6B35"/>
              </svg>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8B7E74] mt-0.5">
              Local Services Marketplace
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-4 py-2 text-sm font-medium text-[#1A1A1A] rounded-full transition-all duration-300 group"
                style={{
                  color: isActive(link.path) ? '#FF6B35' : '#1A1A1A',
                  fontWeight: isActive(link.path) ? 600 : 500,
                }}
              >
                <span className="relative z-10">{link.label}</span>
                <span
                  className="absolute inset-0 bg-[#F3EDE5] rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                  }}
                />
                {isActive(link.path) && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF6B35] rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F3EDE5] transition-colors duration-200"
              aria-label="Search"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>
            <NotificationBell />
            {!user && (
              <Link
                to="/signup?role=professional"
                className="hidden md:inline-flex px-5 py-2.5 text-sm font-medium border border-[#1A1A1A] rounded-full hover:bg-[#F3EDE5] transition-colors duration-200"
              >
                Join as a Pro
              </Link>
            )}

            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1A1A1A] rounded-full hover:bg-[#F3EDE5] transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-[#FF6B35] text-white flex items-center justify-center text-xs font-semibold">
                    {user.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  {user.full_name.split(' ')[0]}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-[rgba(26,26,26,0.08)] shadow-lg py-2 overflow-hidden">
                    <div className="px-4 py-2 border-b border-[rgba(26,26,26,0.06)]">
                      <p className="text-sm font-semibold text-[#1A1A1A] truncate">{user.full_name}</p>
                      <p className="text-xs text-[#8B7E74] capitalize">{user.role}</p>
                    </div>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F3EDE5] transition-colors"
                      >
                        <LayoutDashboard size={15} /> Admin Dashboard
                      </Link>
                    )}
                    {user.role === 'professional' && (
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F3EDE5] transition-colors"
                      >
                        <LayoutDashboard size={15} /> Pro Dashboard
                      </Link>
                    )}
                    {user.role === 'client' && (
                      <Link
                        to="/bookings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F3EDE5] transition-colors"
                      >
                        <LayoutDashboard size={15} /> My Bookings
                      </Link>
                    )}
                    {user.role !== 'admin' && (
                      <Link
                        to="/messages"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F3EDE5] transition-colors"
                      >
                        <MessageSquare size={15} /> Messages
                      </Link>
                    )}
                    {user.role === 'client' && (
                      <Link
                        to="/favourites"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F3EDE5] transition-colors"
                      >
                        <Heart size={15} /> My Favourites
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F3EDE5] transition-colors"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex text-sm font-medium text-[#1A1A1A] hover:text-[#FF6B35] transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center"
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-[320px] bg-white shadow-xl p-8 flex flex-col"
            style={{
              animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="self-end w-10 h-10 flex items-center justify-center mb-8"
            >
              <X size={24} />
            </button>
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-lg font-medium py-2 transition-colors hover:text-[#FF6B35]"
                  style={{ color: isActive(link.path) ? '#FF6B35' : '#1A1A1A' }}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-4 border-[rgba(26,26,26,0.08)]" />
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-[#8B7E74]">
                    <UserIcon size={16} /> {user.full_name}
                  </div>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="inline-flex px-5 py-3 text-sm font-medium border border-[#1A1A1A] rounded-full justify-center"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {user.role === 'professional' && (
                    <Link
                      to="/dashboard"
                      className="inline-flex px-5 py-3 text-sm font-medium border border-[#1A1A1A] rounded-full justify-center"
                    >
                      Pro Dashboard
                    </Link>
                  )}
                  {user.role === 'client' && (
                    <Link
                      to="/bookings"
                      className="inline-flex px-5 py-3 text-sm font-medium border border-[#1A1A1A] rounded-full justify-center"
                    >
                      My Bookings
                    </Link>
                  )}
                  {user.role !== 'admin' && (
                    <Link
                      to="/messages"
                      className="inline-flex px-5 py-3 text-sm font-medium border border-[#1A1A1A] rounded-full justify-center"
                    >
                      Messages
                    </Link>
                  )}
                  {user.role === 'client' && (
                    <Link
                      to="/favourites"
                      className="inline-flex px-5 py-3 text-sm font-medium border border-[#1A1A1A] rounded-full justify-center"
                    >
                      My Favourites
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="inline-flex px-5 py-3 text-sm font-medium bg-[#1A1A1A] text-white rounded-full justify-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex px-5 py-3 text-sm font-medium border border-[#1A1A1A] rounded-full justify-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup?role=professional"
                    className="inline-flex px-5 py-3 text-sm font-medium bg-[#1A1A1A] text-white rounded-full justify-center"
                  >
                    Join as a Pro
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Search Overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-white flex flex-col items-center pt-[15vh] px-6"
          style={{ animation: 'page-fade-in 300ms ease forwards' }}
        >
          <button
            onClick={() => setSearchOpen(false)}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#F3EDE5] transition-colors"
          >
            <X size={24} />
          </button>
          <div className="w-full max-w-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch(searchTerm);
              }}
            >
              <input
                type="text"
                placeholder="Search services, professionals..."
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-3xl md:text-5xl font-[var(--font-heading)] font-bold bg-transparent border-b-2 border-[#1A1A1A] pb-4 outline-none placeholder:text-[#A39B92]"
                style={{ fontFamily: 'var(--font-heading)' }}
              />
            </form>
            <p className="mt-8 text-sm text-[#8B7E74]">Popular searches</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['Plumbing', 'Cleaning', 'Photography', 'Yoga'].map((term) => (
                <button
                  key={term}
                  onClick={() => runSearch(term)}
                  className="px-4 py-2 bg-[#F3EDE5] rounded-full text-sm hover:bg-[#FFF5EE] transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes page-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
