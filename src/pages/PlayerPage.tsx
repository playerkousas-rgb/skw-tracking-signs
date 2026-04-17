import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{motion}from'framer-motion';
import{Compass,ClipboardPaste,Crosshair}from'lucide-react';
import{getGameById,getAllResults}from'../lib/gameStore';

const PP:React.FC=()=>{
  const nav=useNavigate();
  const[ch,setCh]=useState('');const[nm,setNm]=useState('');const[err,setErr]=useState('');

  const join=()=>{
    setErr('');
    if(!nm.trim()){setErr('請輸入代號');return;}
    if(!ch.trim()){setErr('請輸入頻道 ID');return;}
    const g=getGameById(ch.toUpperCase().trim());
    if(!g){setErr('頻道不存在 — 請向領袖確認頻道 ID');return;}
    nav(`/play/${g.id}?name=${encodeURIComponent(nm.trim())}`);
  };

  const paste=async()=>{try{setCh((await navigator.clipboard.readText()).toUpperCase().trim());}catch{}};
  const recent=getAllResults().slice(-3).reverse();

  return(
  <div className="min-h-[calc(100vh-5rem)] grid-bg">
    <div className="px-5 pt-8 pb-3">
      <div className="flex items-center gap-3 mb-1"><div className="w-10 h-10 rounded-xl bg-green-dark flex items-center justify-center border border-green/20"><Compass size={20} className="text-green"/></div>
        <div><h1 className="font-heading font-bold text-2xl text-ice glow-green">成員行動</h1><p className="text-steel text-xs">頻道登入 · 雷達追蹤 · 尋寶探索</p></div>
      </div>
    </div>
    <div className="px-5 space-y-4">
      <div><label className="block text-ice text-xs font-medium mb-1.5">你的代號</label>
        <input type="text" value={nm} onChange={e=>setNm(e.target.value)} placeholder="輸入代號"
          className="w-full px-4 py-3 bg-navy-800 rounded-xl border border-green/10 text-ice placeholder:text-steel focus:outline-none focus:border-green/30"/></div>

      <div>
        <label className="block text-ice text-xs font-medium mb-1.5">頻道 ID</label>
        <p className="text-steel text-[10px] mb-2">輸入領袖提供的頻道 ID 即可加入同一條路線</p>
        <div className="relative">
          <input type="text" value={ch} onChange={e=>setCh(e.target.value.toUpperCase())} placeholder="例：ALPHA7" maxLength={12}
            className="w-full px-4 py-4 bg-navy-800 rounded-xl border border-green/10 text-center font-mono text-xl tracking-[.15em] text-green placeholder:text-steel/30 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:border-green/30"/>
          <button onClick={paste} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-steel hover:text-green transition-colors"><ClipboardPaste size={16}/></button>
        </div>
      </div>

      {err&&<div className="bg-red/10 text-red text-xs px-4 py-2 rounded-lg border border-red/20">{err}</div>}

      <motion.button whileTap={{scale:.97}} onClick={join}
        className="w-full py-4 bg-gradient-to-r from-green-dark to-navy-700 text-green rounded-2xl font-heading font-bold text-lg flex items-center justify-center gap-2 border border-green/20 box-glow-green">
        <Crosshair size={20}/>開始追蹤
      </motion.button>

      {recent.length>0&&<div>
        <h3 className="text-steel text-xs mb-2">最近紀錄</h3>
        {recent.map((r,i)=>(
          <div key={i} className="bg-navy-800/50 rounded-lg border border-cyan/5 p-2.5 flex items-center justify-between mb-1.5">
            <div><div className="text-ice text-sm">{r.playerName}</div><div className="text-steel text-[10px]">{r.answers.filter(a=>a.correct).length}/{r.answers.length}</div></div>
            <div className="font-heading font-bold text-cyan text-sm">{r.totalScore}</div>
          </div>
        ))}
      </div>}

      <button onClick={()=>{if(!nm.trim()){setErr('請先輸入代號');return;}nav(`/quiz?name=${encodeURIComponent(nm.trim())}`);}}
        className="w-full py-3 bg-navy-800 text-gold rounded-xl font-heading font-semibold text-sm border border-gold/10 hover:border-gold/20 transition-colors">
        快速測驗
      </button>
    </div>
    <div className="h-8"/>
  </div>);
};
export default PP;
