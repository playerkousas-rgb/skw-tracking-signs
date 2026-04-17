import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{motion,AnimatePresence}from'framer-motion';
import{Plus,Trash2,Copy,MapPin,Crosshair}from'lucide-react';
import{getAllGames,deleteGame,GameConfig}from'../lib/gameStore';

const LP:React.FC=()=>{
  const nav=useNavigate();
  const[games,setGames]=useState<GameConfig[]>(getAllGames());
  const[copied,setCopied]=useState('');

  const refresh=()=>setGames(getAllGames());
  const del=(id:string)=>{if(confirm('確定刪除此路線？')){deleteGame(id);refresh();}};
  const cp=(t:string,k:string)=>{
    navigator.clipboard.writeText(t).then(()=>{setCopied(k);setTimeout(()=>setCopied(''),2000);}).catch(()=>{
      const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');document.body.removeChild(a);setCopied(k);setTimeout(()=>setCopied(''),2000);
    });
  };

  return(
  <div className="min-h-[calc(100vh-5rem)] grid-bg">
    <div className="px-5 pt-8 pb-3">
      <div className="flex items-center gap-3 mb-1"><div className="w-10 h-10 rounded-xl bg-cyan-dark flex items-center justify-center border border-cyan/20"><Crosshair size={20} className="text-cyan"/></div>
        <div><h1 className="font-heading font-bold text-2xl text-ice glow-cyan">領袖指揮台</h1><p className="text-steel text-xs">GPS埋設 · 頻道分享 · 48小時自動清除</p></div>
      </div>
    </div>
    <div className="px-5 mb-4">
      <motion.button whileTap={{scale:.97}} onClick={()=>nav('/leader/create')}
        className="w-full bg-gradient-to-r from-cyan-dark to-navy-700 text-ice rounded-2xl p-4 flex items-center gap-4 border border-cyan/20 box-glow-cyan card-hover">
        <div className="w-11 h-11 rounded-xl bg-cyan/10 flex items-center justify-center"><Plus size={22} className="text-cyan"/></div>
        <div className="flex-1 text-left"><div className="font-heading font-bold">建立新路線</div><div className="text-ice-dim text-xs">走到哪，投到哪</div></div>
      </motion.button>
    </div>
    <div className="px-5">
      <h2 className="font-heading font-semibold text-ice text-sm mb-2">已建立路線</h2>
      {games.length===0?<div className="text-center py-10"><div className="text-4xl mb-2">📡</div><div className="text-steel text-sm">尚無路線</div></div>:
      <div className="space-y-3">{games.map(g=>(
        <div key={g.id} className="bg-navy-800/70 rounded-2xl border border-cyan/8 p-4">
          <div className="flex items-start justify-between mb-2">
            <div><div className="font-heading font-bold text-ice">{g.name}</div><div className="text-steel text-xs flex items-center gap-1 mt-0.5"><MapPin size={10}/>{g.trail.length}個符號</div></div>
            <button onClick={()=>del(g.id)} className="p-1.5 text-steel hover:text-red transition-colors"><Trash2 size={14}/></button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-navy-900 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="text-steel text-[10px]">頻道</span>
              <span className="font-mono font-bold text-cyan text-sm tracking-wider">{g.id}</span>
            </div>
            <button onClick={()=>cp(g.id,'id-'+g.id)} className={`p-2 rounded-lg transition-colors ${copied==='id-'+g.id?'bg-cyan/20 text-cyan':'bg-navy-900 text-steel hover:text-cyan'}`}><Copy size={14}/></button>
          </div>
          <div className="mt-2 text-steel/40 text-[9px] font-mono">分享此頻道 ID 給成員即可加入</div>
        </div>
      ))}</div>}
    </div>

    {/* 使用說明 */}
    <div className="px-5 py-6">
      <div className="bg-navy-800/40 rounded-2xl p-4 border border-cyan/5">
        <div className="font-heading font-semibold text-cyan/70 text-xs mb-2">📋 使用說明</div>
        <ol className="text-steel text-[11px] leading-relaxed space-y-1 list-decimal list-inside">
          <li>建立路線，輸入名稱</li>
          <li>走到位置，投放追蹤符號</li>
          <li>複製<b className="text-cyan">頻道 ID</b>告訴成員</li>
          <li>成員輸入同一頻道 ID 即可加入</li>
          <li>路線<b className="text-gold">48小時後自動刪除</b></li>
        </ol>
      </div>
    </div>
    <div className="h-4"/>
  </div>);
};
export default LP;
