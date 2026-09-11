import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  Heart,
  User,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Landmark,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SearchBar } from '@/components/SearchBar';

export function Navbar() {
  const { session, profile, signOut, isAdmin, isStaff } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/collection', label: 'Collection' },
    { to: '/exhibitions', label: 'Exhibitions' },
    { to: '/about', label: 'About' },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-stone-50/95 backdrop-blur-md shadow-sm' : 'bg-stone-50'
      } border-b border-stone-200`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 bg-stone-800 rounded-lg">
              <Landmark size={20} className="text-amber-400" />
            </div>
            <div className="hidden sm:block">
              <span className="font-serif font-bold text-stone-800 text-lg leading-none">Heritage</span>
              <span className="block text-[10px] text-stone-500 tracking-widest uppercase">Museum Collection</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block w-56 lg:w-64">
              <SearchBar />
            </div>

            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-stone-100 transition-colors"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 flex items-center justify-center text-sm font-semibold">
                    {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <ChevronDown size={16} className="text-stone-400 hidden sm:block" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-xl border border-stone-200 z-50 overflow-hidden animate-fade-in">
                      <div className="px-4 py-3 border-b border-stone-100">
                        <p className="text-sm font-semibold text-stone-800">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-stone-500">{profile?.email}</p>
                        <span className="badge bg-amber-100 text-amber-700 mt-1.5 capitalize">{profile?.role}</span>
                      </div>
                      <div className="py-1">
                        <Link to="/favorites" className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                          <Heart size={16} /> Favorites
                        </Link>
                        {isStaff && (
                          <Link
                            to={isAdmin ? '/admin/dashboard' : '/curator/dashboard'}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                          >
                            <LayoutDashboard size={16} /> Dashboard
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm hidden sm:inline-flex">
                <User size={16} /> Sign in
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden py-4 border-t border-stone-200 animate-fade-in">
            <div className="mb-4">
              <SearchBar className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to) ? 'text-amber-700 bg-amber-50' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {session && (
                <>
                  <Link to="/favorites" className="px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100">
                    Favorites
                  </Link>
                  {isStaff && (
                    <Link
                      to={isAdmin ? '/admin/dashboard' : '/curator/dashboard'}
                      className="px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100"
                    >
                      Dashboard
                    </Link>
                  )}
                </>
              )}
              {!session && (
                <Link to="/login" className="btn-primary text-sm mt-2">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
