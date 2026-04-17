import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, BookOpen, Compass, Zap } from 'lucide-react';

const H:React.FC=()=>{
  const nav=useNavigate();
  const c={hidden:{opacity:0},show:{opacity:1,transition:{staggerChildren:.1}}};
  const i={hidden:{opacity:0,y:20},show:{opacity:1,y:0}};

  return(
  <div className="min-h-[calc(100vh-5rem)] grid-bg relative">
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950"/>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
        <div className="absolute inset-0 rounded-full border border-cyan/5"/>
        <div className="absolute inset-[15%] rounded-full border border-cyan/8"/>
        <div className="absolute inset-[30%] rounded-full border border-cyan/10"/>
        <div className="absolute inset-0 animate-radar"><div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-cyan/40 to-transparent origin-left"/></div>
      </div>
      <div className="relative px-6 pt-14 pb-12 text-center z-10">
        <motion.div initial={{scale:.7,opacity:0}}animate={{scale:1,opacity:1}}transition={{duration:.5,type:'spring'}}>
          <div className="w-20 h-20 mx-auto bg-navy-800 rounded-2xl flex items-center justify-center border border-cyan/20 box-glow-cyan mb-5"><Crosshair size={36} className="text-cyan"/></div>
        </motion.div>
        <motion.h1 initial={{opacity:0,y:20}}animate={{opacity:1,y:0}}transition={{delay:.2}} className="font-heading text-5xl font-bold text-ice glow-cyan mb-1">追蹤符號</motion.h1>
        <motion.div initial={{opacity:0}}animate={{opacity:1}}transition={{delay:.35}} className="font-mono text-[10px] text-cyan/50 tracking-[.4em] mb-3">TRACKING SIGNS</motion.div>
        <motion.p initial={{opacity:0}}animate={{opacity:1}}transition={{delay:.5}} className="text-steel-light text-sm max-w-xs mx-auto">童軍實地追蹤行動 · GPS定位 · 隱形符號探索</motion.p>
      </div>
    </div>
    <motion.div variants={c} initial="hidden" animate="show" className="px-5 space-y-3 pt-1 pb-4 z-10 relative">
      {[{to:'/learn',icon:BookOpen,cl:'bg-navy-800/80 border-cyan/10',ic:'bg-cyan-dark text-cyan',t:'符號圖鑑',d:'10種官方追蹤符號 · 發光圖示',gl:''},
        {to:'/leader',icon:Crosshair,cl:'bg-gradient-to-r from-cyan-dark to-navy-700 border-cyan/20 box-glow-cyan',ic:'bg-cyan/10 text-cyan',t:'領袖指揮台',d:'GPS埋設 · 頻道分享',gl:'glow-cyan'},
        {to:'/player',icon:Compass,cl:'bg-gradient-to-r from-green-dark to-navy-700 border-green/20 box-glow-green',ic:'bg-green/10 text-green',t:'成員行動',d:'頻道登入 · 雷達追蹤 · 震動提示',gl:'glow-green'},
        {to:'/quiz',icon:Zap,cl:'bg-navy-800/80 border-gold/10',ic:'bg-gold/10 text-gold',t:'快速測驗',d:'隨機出題 · 即時驗證',gl:''}
      ].map((x, idx)=>(
        <motion.div key={idx} variants={i}>
          <button onClick={()=>nav(x.to)} className={`w-full card-hover ${x.cl} rounded-2xl p-4 flex items-center gap-4 text-left border`}>
            <div className={`w-12 h-12 rounded-xl ${x.ic} flex items-center justify-center flex-shrink-0`}><x.icon size={24}/></div>
            <div className="flex-1"><div className={`font-heading font-bold text-ice text-base ${x.gl}`}>{x.t}</div><div className="text-ice-dim text-xs">{x.d}</div></div>
            <span className="text-cyan/20 text-lg">›</span>
          </button>
        </motion.div>
      ))}
    </motion.div>
    <div className="px-5 pb-6 z-10 relative">
      <div className="bg-navy-800/50 rounded-xl border border-cyan/5 p-3 flex items-center justify-around text-center">
        <div><div className="font-heading font-bold text-lg text-cyan">10</div><div className="text-steel text-[9px]">符號</div></div>
        <div className="w-px h-5 bg-cyan/10"/><div><div className="font-heading font-bold text-lg text-green">GPS</div><div className="text-steel text-[9px]">定位</div></div>
        <div className="w-px h-5 bg-cyan/10"/><div><div className="font-heading font-bold text-lg text-gold">3m</div><div className="text-steel text-[9px]">觸發</div></div>
      </div>
    </div>
  </div>);
};
export default H;
