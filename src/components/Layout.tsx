import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Compass, PenTool, Map } from 'lucide-react';

const items = [
  { path: '/', icon: Map, label: '營地' },
  { path: '/learn', icon: BookOpen, label: '圖鑑' },
  { path: '/leader', icon: PenTool, label: '領袖' },
  { path: '/player', icon: Compass, label: '追蹤' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const nav = useNavigate();
  const loc = useLocation();

  const isActive = (path: string) =>
    path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path);

  return (
    <div className="min-h-screen paper-grain flex flex-col">
      <div className="h-safe-top" />
      <main className="flex-1 pb-[76px]">
        <div className="mx-auto w-full max-w-[520px] px-4 pt-3">{children}</div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50">
        <div className="mx-auto max-w-[520px] px-3 pb-safe">
          <div className="mb-2 flex items-center justify-around rounded-[22px] border border-ink/15 bg-[#f8f1e1]/95 backdrop-blur-md shadow-[0_10px_30px_-16px_rgba(38,33,26,0.55)] px-1.5 py-1.5">
            {items.map(({ path, icon: Icon, label }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => nav(path)}
                  className={`press relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-colors ${
                    active ? 'text-forest' : 'text-ink-4'
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-2xl bg-forest/10" />
                  )}
                  <Icon size={19} strokeWidth={active ? 2.4 : 1.7} className="relative" />
                  <span className={`relative text-[9.5px] tracking-wide ${active ? 'font-semibold' : ''}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
