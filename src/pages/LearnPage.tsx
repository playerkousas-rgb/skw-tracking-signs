import React,{useState}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Search,X}from'lucide-react';
import SignSVG from'../components/SignSVG';
import{trackingSigns}from'../data/trackingSigns';

const L:React.FC=()=>{
  const[q,setQ]=useState('');const[open,setOpen]=useState<number|null>(null);
  const f=trackingSigns.filter(s=>!q||s.nameZh.includes(q)||s.nameEn.toLowerCase().includes(q.toLowerCase()));
  return(
  <div className="min-h-[calc(100vh-5rem)] grid-bg">
    <div className="sticky top-0 z-40 bg-navy-950/90 backdrop-blur-xl border-b border-cyan/10">
      <div className="px-5 py-3">
        <h1 className="font-heading font-bold text-xl text-ice glow-cyan mb-2">符號圖鑑</h1>
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel"/>
          <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋..." className="w-full pl-9 pr-4 py-2 bg-navy-800 rounded-lg border border-cyan/10 text-sm text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30"/>
        </div>
      </div>
    </div>
    <div className="px-4 py-4 grid grid-cols-2 gap-3">
      {f.map((s,i)=>(
        <motion.button key={s.id} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*.04}} onClick={()=>setOpen(open===s.id?null:s.id)}
          className="bg-navy-800/70 rounded-2xl p-3 border border-cyan/8 text-left card-hover">
          <div className="flex items-center justify-center py-2"><SignSVG signId={s.id} size={65}/></div>
          <div className="text-center mt-1"><div className="font-heading font-bold text-ice text-sm">{s.nameZh}</div><div className="text-steel text-[10px]">{s.nameEn}</div></div>
          {s.isWarning&&<div className="text-center mt-1"><span className="text-[9px] px-2 py-0.5 rounded-full bg-red/10 text-red border border-red/20">警告</span></div>}
        </motion.button>
      ))}
    </div>
    <AnimatePresence>{open!==null&&(()=>{
      const s=trackingSigns.find(x=>x.id===open);if(!s)return null;
      return(
        <motion.div key="m" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-navy-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={()=>setOpen(null)}>
          <motion.div initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.8,opacity:0}} onClick={e=>e.stopPropagation()} className="bg-navy-800 rounded-3xl border border-cyan/20 p-6 w-full max-w-sm box-glow-cyan">
            <div className="flex justify-between items-center mb-3"><div><div className="font-heading font-bold text-ice text-xl">{s.nameZh}</div><div className="text-cyan/50 font-mono text-xs">{s.nameEn}</div></div>
              <button onClick={()=>setOpen(null)} className="p-2 text-steel hover:text-ice"><X size={18}/></button></div>
            <div className="flex justify-center py-5"><SignSVG signId={s.id} size={150}/></div>
            <p className="text-ice-dim text-sm leading-relaxed text-center">{s.description}</p>
          </motion.div>
        </motion.div>);
    })()}</AnimatePresence>
  </div>);
};
export default L;
