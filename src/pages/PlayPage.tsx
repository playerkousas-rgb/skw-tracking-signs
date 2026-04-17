import React,{useState,useEffect,useCallback,useRef}from'react';
import{useNavigate,useParams,useSearchParams}from'react-router-dom';
import{motion,AnimatePresence}from'framer-motion';
import{CheckCircle,XCircle,Crosshair,Trophy,Map,AlertTriangle}from'lucide-react';
import SignSVG from'../components/SignSVG';
import{getGameById,saveResult,getDist,watchPos,clearW,vibrate,GameConfig}from'../lib/gameStore';
import{getSignById,getWrongOptions,TrackingSign,trackingSigns}from'../data/trackingSigns';

const R=3;// 3m觸發半徑 — 15m太遠，一條街可能已有多條路線

const Play:React.FC=()=>{
  const nav=useNavigate();const{gameId}=useParams<{gameId:string}>();const[sp]=useSearchParams();const pn=sp.get('name')||'隊員';
  const[game,setGame]=useState<GameConfig|null>(null);
  const[pos,setPos]=useState<{lat:number;lng:number;acc:number}|null>(null);
  const[gpsErr,setGpsErr]=useState('');
  const[idx,setIdx]=useState(0);
  const[discovered,setDiscovered]=useState(false);
  const[sel,setSel]=useState<number|undefined>(undefined);
  const[showRes,setShowRes]=useState(false);
  const[opts,setOpts]=useState<TrackingSign[]>([]);
  const[ans,setAns]=useState<{signId:number;correct:boolean}[]>([]);
  const[dist,setDist]=useState<number|null>(null);
  const[showMap,setShowMap]=useState(false);
  const[gpsWarn,setGpsWarn]=useState(false);
  const[flash,setFlash]=useState(false);
  const wRef=useRef(-1);

  useEffect(()=>{if(gameId){const g=getGameById(gameId);if(g)setGame(g);}},[gameId]);

  useEffect(()=>{
    wRef.current=watchPos(
      (lat,lng,acc)=>{setPos({lat,lng,acc});setGpsErr('');setGpsWarn(acc>10);},
      e=>setGpsErr(e)
    );
    return()=>clearW(wRef.current);
  },[]);

  useEffect(()=>{
    if(!game||!pos||idx>=game.trail.length)return;
    const t=game.trail[idx];
    const d=getDist(pos.lat,pos.lng,t.lat,t.lng);
    setDist(Math.round(d));
    if(d<=R&&!discovered) fireDiscover();
  },[pos,game,idx,discovered]);

  // 警告符號：接近任何未發現的警告符號時觸發
  useEffect(()=>{
    if(!game||!pos||discovered)return;
    for(let i=0;i<game.trail.length;i++){
      if(i===idx)continue;
      const s=getSignById(game.trail[i].signId);
      if(!s?.isWarning)continue;
      const d=getDist(pos.lat,pos.lng,game.trail[i].lat,game.trail[i].lng);
      if(d<=R){setIdx(i);setDiscovered(false);setDist(Math.round(d));break;}
    }
  },[pos,game,idx,discovered]);

  const fireDiscover=useCallback(()=>{
    if(!game||idx>=game.trail.length)return;
    const sign=getSignById(game.trail[idx].signId);if(!sign)return;
    setOpts([sign,...getWrongOptions(sign,3)].sort(()=>Math.random()-.5));
    setDiscovered(true);setSel(undefined);setShowRes(false);
    // 🔔 震動 + 閃光
    vibrate([80,40,80,40,150]);
    setFlash(true);
    setTimeout(()=>setFlash(false),600);
  },[game,idx]);

  const pick=(sid:number)=>{
    if(showRes||!game)return;
    const ok=sid===game.trail[idx].signId;
    setSel(sid);setShowRes(true);
    setAns(p=>[...p,{signId:game.trail[idx].signId,correct:ok}]);
    if(ok) vibrate([50]); else vibrate([200]);
  };

  const next=()=>{
    if(!game)return;
    if(idx+1>=game.trail.length){
      const c=ans.filter(a=>a.correct).length;
      saveResult({playerName:pn,gameId:game.id,answers:ans,totalScore:c*100,completedAt:Date.now()});
      nav(`/result?score=${c*100}&total=${game.trail.length}&correct=${c}&name=${encodeURIComponent(pn)}`);
    }else{setIdx(p=>p+1);setDiscovered(false);setDist(null);}
  };

  if(!game)return(<div className="min-h-screen bg-navy-950 flex items-center justify-center px-6"><div className="text-center"><div className="text-5xl mb-3">📡</div><div className="text-steel font-heading">頻道不存在</div>
    <button onClick={()=>nav('/player')} className="mt-4 px-6 py-2 bg-cyan-dark text-cyan rounded-xl font-heading">返回</button></div></div>);

  const prog=((idx+(showRes?1:0))/game.trail.length)*100;
  const sc=ans.filter(a=>a.correct).length;
  const curSign=getSignById(game.trail[idx].signId);

  return(
  <div className="min-h-screen flex flex-col bg-navy-950 relative">
    {/* 🔔 閃光層 */}
    <AnimatePresence>{flash&&(
      <motion.div key="flash" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
        className="fixed inset-0 z-[100] pointer-events-none bg-cyan/20"/>
    )}</AnimatePresence>

    {/* 頂欄 */}
    <div className="sticky top-0 z-40 bg-navy-950/90 backdrop-blur-xl border-b border-cyan/10">
      <div className="px-5 py-2">
        <div className="flex items-center justify-between mb-1"><span className="font-heading font-semibold text-ice text-xs truncate">{game.name}</span><span className="font-mono text-cyan text-xs font-bold">{sc*100}pt</span></div>
        <div className="w-full h-1.5 bg-navy-800 rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-cyan to-green rounded-full" initial={{width:0}} animate={{width:`${prog}%`}} transition={{duration:.3}}/></div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-steel text-[10px] font-mono">STN {idx+1}/{game.trail.length}</span>
          <button onClick={()=>setShowMap(!showMap)} className={`text-[10px] font-medium flex items-center gap-1 transition-colors ${showMap?'text-cyan':'text-steel hover:text-ice-dim'}`}><Map size={10}/>地圖</button>
        </div>
      </div>
    </div>

    {/* 地圖 */}
    <AnimatePresence>{showMap&&pos&&(
      <motion.div initial={{height:0}} animate={{height:220}} exit={{height:0}} className="overflow-hidden z-30">
        <iframe title="map" width="100%" height="220" style={{border:0,filter:'invert(90%) hue-rotate(180deg) brightness(0.8) contrast(1.2)'}} src={`https://www.openstreetmap.org/export/embed.html?bbox=${pos.lng-.003}%2C${pos.lat-.002}%2C${pos.lng+.003}%2C${pos.lat+.002}&layer=mapnik&marker=${pos.lat}%2C${pos.lng}`}/>
        <div className="bg-navy-800/80 px-4 py-1.5 flex items-center gap-2 border-b border-cyan/5">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse"/><span className="text-ice text-[10px] font-mono">你的位置</span>
          {game.trail[idx]&&<><span className="text-steel text-[10px]">·</span><span className="text-cyan text-[10px] font-mono">目標 {dist}m</span></>}
        </div>
      </motion.div>
    )}</AnimatePresence>

    {gpsWarn&&pos&&<div className="bg-gold/10 border-b border-gold/20 px-5 py-1.5 flex items-center gap-2"><AlertTriangle size={12} className="text-gold flex-shrink-0"/><span className="text-gold text-[10px]">GPS 精度 ±{Math.round(pos.acc)}m，位置可能有偏差</span></div>}

    {/* 主畫面 */}
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-6">
      <AnimatePresence mode="wait">
      {!discovered?(
        <motion.div key="s" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full max-w-sm text-center">
          <div className="relative w-44 h-44 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border border-cyan/8"/>
            <div className="absolute inset-[22%] rounded-full border border-cyan/6"/>
            <div className="absolute inset-[44%] rounded-full border border-cyan/5"/>
            <div className="absolute inset-0 animate-radar"><div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-cyan/50 to-transparent origin-left"/></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"><div className="w-3 h-3 rounded-full bg-cyan/80"/><div className="absolute inset-0 rounded-full bg-cyan/30 animate-pulse-ring"/></div>
          </div>
          <h2 className="font-heading font-bold text-2xl text-ice glow-cyan mb-1">搜尋路徑中</h2>
          <p className="text-steel text-sm mb-6">前往下一個符號位置</p>
          {pos?(
            <div className="bg-navy-800/60 rounded-2xl border border-cyan/8 p-4">
              <div className="font-heading font-bold text-4xl text-cyan glow-cyan mb-1">{dist!==null?`${dist}m`:'---'}</div>
              <div className="text-steel text-xs">{dist!==null&&dist<=R?'🎯 已到達！':dist!==null&&dist<=20?'接近中...':'向目標前進'}</div>
              {curSign&&<div className="mt-2 text-steel/40 text-[10px]">下一站：{curSign.isWarning?'⚠️ 警告符號':curSign.nameZh}</div>}
            </div>
          ):(
            <div className="bg-navy-800/60 rounded-2xl border border-cyan/8 p-4"><div className="text-cyan text-sm animate-blink">正在定位...</div>{gpsErr&&<div className="text-red text-xs mt-1">{gpsErr}</div>}</div>
          )}
          <div className="mt-5 text-steel/30 text-[9px] font-mono">RADIUS {R}m · SEQUENTIAL</div>
        </motion.div>
      ):(
        <motion.div key="r" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full max-w-sm">
          <motion.div initial={{scale:.5,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:300,damping:20}} className="text-center mb-3">
            <div className="inline-flex items-center gap-2 bg-green/15 text-green text-xs font-mono font-bold px-4 py-1.5 rounded-full border border-green/20 glow-green"><Crosshair size={12}/>符號發現</div>
          </motion.div>

          <motion.div initial={{scale:.15,opacity:0,filter:'blur(30px) brightness(3)'}} animate={{scale:1,opacity:1,filter:'blur(0px) brightness(1)'}} transition={{delay:.15,duration:.6,type:'spring',stiffness:180}} className="bg-navy-800/80 rounded-3xl border border-cyan/20 p-5 mb-5 box-glow-cyan text-center">
            <div className="text-steel text-xs mb-3">這是甚麼符號？</div>
            <div className="flex items-center justify-center py-2"><div className="animate-sign-reveal"><SignSVG signId={game.trail[idx].signId} size={150}/></div></div>
            {game.trail[idx].paces&&<div className="mt-2 text-gold text-sm font-mono glow-gold">走 {game.trail[idx].paces} 步找信物</div>}
          </motion.div>

          <div className="grid gap-2.5">{opts.map(o=>{
            const ok=o.id===game.trail[idx].signId,pk=o.id===sel;
            let c='bg-navy-800/70 border border-cyan/8 text-ice';
            if(showRes){if(ok)c='bg-green/10 border border-green/30 text-green';else if(pk&&!ok)c='bg-red/10 border border-red/30 text-red';else c='bg-navy-800/30 border border-steel/5 text-steel/25';}
            else c='bg-navy-800/70 border border-cyan/8 text-ice hover:border-cyan/20';
            return(
              <motion.button key={o.id} whileTap={!showRes?{scale:.97}:undefined} onClick={()=>pick(o.id)} disabled={showRes} className={`p-3.5 rounded-2xl font-heading font-semibold transition-all flex items-center gap-3 ${c}`}>
                <div className="w-10 h-10 flex-shrink-0 bg-navy-900 rounded-xl flex items-center justify-center"><SignSVG signId={o.id} size={36} glow={false}/></div>
                <div className="flex-1 text-left"><div className="font-bold text-sm">{o.nameZh}</div><div className="text-[10px] opacity-50">{o.nameEn}</div></div>
                {showRes&&ok&&<CheckCircle size={18} className="text-green"/>}
                {showRes&&pk&&!ok&&<XCircle size={18} className="text-red"/>}
              </motion.button>);
          })}</div>

          {showRes&&<motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="mt-5">
            <button onClick={next} className="w-full py-4 bg-gradient-to-r from-cyan/20 to-green/10 text-cyan rounded-2xl font-heading font-bold text-lg border border-cyan/30 box-glow-cyan flex items-center justify-center gap-2">
              {idx+1>=game.trail.length?<><Trophy size={20}/>任務完成</>:<><Crosshair size={18}/>前往下一站</>}
            </button>
          </motion.div>}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  </div>);
};
export default Play;
