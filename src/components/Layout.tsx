import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, PenTool, Compass } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const nav = useNavigate();
  const loc = useLocation();

  const items = [
    { path: '/', icon: Home, label: '首頁' },
    { path: '/learn', icon: BookOpen, label: '符號' },
    { path: '/leader', icon: PenTool, label: '建立' },
    { path: '/player', icon: Compass, label: '追蹤' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return loc.pathname === '/';
    return loc.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#02133E' }}>
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-lg border-t border-cyan/10 pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
          {items.map(({ path, icon: Icon, label }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => nav(path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 ${
                  active ? 'text-cyan' : 'text-steel hover:text-ice-dim'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[10px] font-heading font-medium ${active ? 'glow-cyan' : ''}`}>
                  {label}
                </span>
                {active && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;