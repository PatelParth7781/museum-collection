import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  GalleryVerticalEnd,
  Tags,
  Users,
  ScrollText,
  MapPin,
  Brush,
  History,
  LogOut,
  Menu,
  X,
  Landmark,
  Shield,
  Boxes,
  ShoppingCart,
  Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/artifacts', label: 'Artifacts', icon: Package },
  { to: '/admin/exhibitions', label: 'Exhibitions', icon: GalleryVerticalEnd },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/artists', label: 'Artists', icon: Users },
  { to: '/admin/periods', label: 'Historical Periods', icon: History },
  { to: '/admin/locations', label: 'Locations', icon: MapPin },
  { to: '/admin/users', label: 'Users', icon: Shield },
  { to: '/admin/cart', label: 'Carts', icon: ShoppingCart },
  { to: '/admin/reviews', label: 'Reviews & Ratings', icon: Star },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

const curatorNav: NavItem[] = [
  { to: '/curator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/curator/artifacts', label: 'Artifacts', icon: Package },
  { to: '/curator/exhibitions', label: 'Exhibitions', icon: GalleryVerticalEnd },
  { to: '/curator/conservation', label: 'Conservation', icon: Brush },
  { to: '/curator/provenance', label: 'Provenance', icon: ScrollText },
];

export function DashboardLayout({ children, title }: { children: ReactNode; title: string }) {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = isAdmin ? adminNav : curatorNav;
  const basePath = isAdmin ? '/admin' : '/curator';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-stone-900 text-stone-300 fixed inset-y-0 left-0 z-30">
        <div className="p-5 border-b border-stone-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="p-1.5 bg-stone-800 rounded-lg">
              <Landmark size={20} className="text-amber-400" />
            </div>
            <div>
              <span className="font-serif font-bold text-stone-100 text-base leading-none">Heritage</span>
              <span className="block text-[10px] text-stone-500 tracking-widest uppercase">{profile?.role} Panel</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                  isActive(item.to)
                    ? 'bg-stone-800 text-amber-400'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-stone-800">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors mb-1">
            <Boxes size={18} /> View Public Site
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors w-full text-left"
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-stone-900 text-stone-300 z-50 lg:hidden overflow-y-auto animate-slide-in-right">
            <div className="p-5 border-b border-stone-800 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="p-1.5 bg-stone-800 rounded-lg">
                  <Landmark size={20} className="text-amber-400" />
                </div>
                <span className="font-serif font-bold text-stone-100">{profile?.role} Panel</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-stone-400">
                <X size={20} />
              </button>
            </div>
            <nav className="py-4 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                      isActive(item.to) ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:bg-stone-800'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
              <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-800 mt-1">
                <Boxes size={18} /> View Public Site
              </Link>
              <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-800 w-full text-left">
                <LogOut size={18} /> Sign out
              </button>
            </nav>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
              <h1 className="text-lg font-semibold text-stone-800">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 flex items-center justify-center text-sm font-semibold">
                {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-sm text-stone-600 hidden sm:block">{profile?.full_name}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
