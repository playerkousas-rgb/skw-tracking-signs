import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Crosshair, Compass } from 'lucide-react';

const Layout: React.FC<{children:React.ReactNode}>=({children})=>{
  const nav=useNavigate(),loc=useLocation();
  const items=[{path:'/',icon:Home,label:'首頁'},{path:'/learn',icon:BookOpen,label:'符號'},{path:'/leader',icon:Crosshair,label:'領袖'},{path:'/player',icon:Compass,label:'成員'}];
  const act=(p:string)=>p==='/'?loc.pathname==='/':loc.pathname.startsWith(p);
  return(
    <div className="min-h-screen flex flex-col bg-navy-950">
      <main className="flex-1 pb-[4.5rem]">{children}</main>
      <div className="px-6 py-1.5 text-center text-steel text-[8px] tracking-widest uppercase">© 2026 SKWSCOUT · All rights reserved</div>
      <nav className="fixed bottom-0 left-0 right-0 bg-navy-900/95 backdrop-blur-xl border-t border-cyan/10 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-1.5">
          {items.map(({path,icon:Icon,label})=>(
            <button key={path} onClick={()=>nav(path)} className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all ${act(path)?'text-cyan':'text-steel hover:text-ice-dim'}`}>
              <Icon size={19} strokeWidth={act(path)?2.5:1.5}/><span className="text-[9px] font-medium">{label}</span>
              {act(path)&&<div className="w-1 h-1 rounded-full bg-cyan"/>}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
export default Layout;
