import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Sparkles } from 'lucide-react';
import RestartDemoButton from '@/components/RestartDemoButton';

// Bottom navigation shared across the app screens.
export default function Layout({ children }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex flex-col">
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24 pt-6">
        <div className="flex justify-end pb-1">
          <RestartDemoButton />
        </div>
        {children}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-2xl flex items-center justify-around px-6 py-2">
          <NavItem to="/" label="Home" icon={Home} active={isActive('/') && !isActive('/dashboard') && !isActive('/activities')} />
          <NavItem to="/activities" label="Activities" icon={Sparkles} active={isActive('/activities')} />
          <NavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} active={isActive('/dashboard')} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, active }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-colors ${
        active ? 'text-[#D96969]' : 'text-black/40'
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} />
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}