import React,{useState,useEffect,useCallback}from'react';
import{useNavigate,useSearchParams}from'react-router-dom';
import{motion,AnimatePresence}from'framer-motion';
import{CheckCircle,XCircle,ArrowRight,Trophy}from'lucide-react';
import SignSVG from'../components/SignSVG';
import{saveResult}from'../lib/gameStore';
import{getRandomSigns,getWrongOptions,TrackingSign}from'../data/trackingSigns';

const Q:React.FC=()=>{
  const nav=useNavigate();const[sp]=useSearchParams();const pn=sp.get('name')||'玩家';
  const[qs]=useState<TrackingSign[]>(()=>getRandomSigns(10));
  const[ci,setCi]=useState(0);const[ans,setAns]=useState<{signId:number;correct:boolean}[]>([]);
  const[opts,setOpts]=useState<TrackingSign[]>([]);const[sel,setSel]=useState<number|undefined>(undefined);
  const[showRes,setShowRes]=useState(false);const[started,setStarted]=useState(false);

  const setup=useCallback((i:number)=>{if(i>=qs.length)return;const s=qs[i];setOpts([s,...getWrongOptions(s,3)].sort(()=>Math.random()-.5));setSel(undefined);setShowRes(false);},[qs]);
  useEffect(()=>{if(started)setup(ci);},[started,ci,setup]);

  const pick=(sid:number)=>{if(showRes)return;const ok=sid===qs[ci].id;setSel(sid);setShowRes(true);setAns(p=>[...p,{signId:qs[ci].id,correct:ok}]);};
  const next=()=>{if(ci+1>=qs.length){const c=ans.filter(a=>a.correct).length;saveResult({playerName:pn,gameId:'q-'+Date.now(),answers:ans,totalScore:c*100,completedAt:Date.now()});nav(`/result?score=${c*100}&total=${qs.length}&correct=${c}&name=${encodeURIComponent(pn)}`);}else setCi(p=>p+1);};

  if(!started)return(<div className="min-h-screen bg-navy-950 flex items-center justify-center px-6">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="text-center max-w-sm w-full">
      <div className="w-20 h-20 mx-auto bg-gold/10 rounded-3xl flex items-center justify-center border border-gold/20 mb-6"><Trophy size={40} className="text-gold"/></div>
      <h1 className="font-heading font-bold text-3xl text-ice mb-2">快速測驗</h1><p className="text-steel text-sm mb-6">10題隨機追蹤符號</p>
      <div className="bg-navy-800/60 rounded-2xl border border-cyan/5 p-4 mb-6 grid grid-cols-2 gap-3 text-center">
        <div><div className="font-heading font-bold text-2xl text-cyan">10</div><div className="text-steel text-[10px]">題目</div></div>
        <div><div className="font-heading font-bold text-2xl text-green">4</div><div className="text-steel text-[10px]">選項</div></div>
      </div>
      <button onClick={()=>setStarted(true)} className="w-full py-4 bg-gradient-to-r from-gold/20 to-cyan/10 text-gold rounded-2xl font-heading font-bold text-lg border border-gold/30 glow-gold">開始測驗！</button>
      <button onClick={()=>nav('/')} className="mt-3 text-steel text-sm">返回首頁</button>
    </motion.div></div>);

  const prog=((ci+(showRes?1:0))/qs.length)*100;const sc=ans.filter(a=>a.correct).length;
  return(<div className="min-h-screen flex flex-col bg-navy-950">
    <div className="sticky top-0 z-40 bg-navy-950/90 backdrop-blur-xl border-b border-cyan/10"><div className="px-5 py-2">
      <div className="flex items-center justify-between mb-1"><span className="font-heading font-semibold text-ice text-xs">快速測驗</span><span className="text-cyan font-heading font-bold text-xs">{sc*100}pt</span></div>
      <div className="w-full h-1.5 bg-navy-800 rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-gold to-cyan rounded-full" initial={{width:0}} animate={{width:`${prog}%`}} transition={{duration:.3}}/></div>
      <div className="text-steel text-[10px] mt-1 font-mono">{ci+1}/{qs.length}</div>
    </div></div>
    <div className="flex-1 px-5 py-6 flex flex-col items-center"><AnimatePresence mode="wait"><motion.div key={ci} initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.9}} className="w-full max-w-sm">
      <div className="bg-navy-800/80 rounded-3xl border border-cyan/10 p-5 mb-5 text-center"><div className="text-steel text-xs mb-3">這是甚麼符號？</div><div className="flex items-center justify-center py-3"><SignSVG signId={qs[ci].id} size={140}/></div></div>
      <div className="grid gap-2.5">{opts.map(o=>{const ok=o.id===qs[ci].id,pk=o.id===sel;let c='bg-navy-800/70 border border-cyan/8 text-ice';if(showRes){if(ok)c='bg-green/10 border border-green/30 text-green';else if(pk&&!ok)c='bg-red/10 border border-red/30 text-red';else c='bg-navy-800/30 border border-steel/5 text-steel/25';}else c='bg-navy-800/70 border border-cyan/8 text-ice hover:border-gold/20';
        return(<motion.button key={o.id} whileTap={!showRes?{scale:.97}:undefined} onClick={()=>pick(o.id)} disabled={showRes} className={`p-3.5 rounded-2xl font-heading font-semibold transition-all flex items-center gap-3 ${c}`}>
          <div className="w-10 h-10 flex-shrink-0 bg-navy-900 rounded-xl flex items-center justify-center"><SignSVG signId={o.id} size={36} glow={false}/></div>
          <div className="flex-1 text-left"><div className="font-bold text-sm">{o.nameZh}</div><div className="text-[10px] opacity-50">{o.nameEn}</div></div>
          {showRes&&ok&&<CheckCircle size={18} className="text-green"/>}{showRes&&pk&&!ok&&<XCircle size={18} className="text-red"/>}
        </motion.button>);})}</div>
      {showRes&&<motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="mt-5"><button onClick={next} className="w-full py-4 bg-gradient-to-r from-gold/20 to-cyan/10 text-gold rounded-2xl font-heading font-bold text-lg border border-gold/30 flex items-center justify-center gap-2">{ci+1>=qs.length?<><Trophy size={20}/>查看成績</>:<>下一題<ArrowRight size={18}/></>}</button></motion.div>}
    </motion.div></AnimatePresence></div>
  </div>);
};
export default Q;
