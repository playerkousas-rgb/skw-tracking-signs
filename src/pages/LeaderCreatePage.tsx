import React,{useState,useEffect,useCallback}from'react';
import{useNavigate,useSearchParams}from'react-router-dom';
import{motion,AnimatePresence}from'framer-motion';
import{ArrowLeft,MapPin,Check,X,Navigation,Crosshair,AlertTriangle}from'lucide-react';
import SignSVG from'../components/SignSVG';
import{trackingSigns}from'../data/trackingSigns';
import{saveGame,genId,getGameById,getPos,GameConfig,TrailPoint}from'../lib/gameStore';

const LC:React.FC=()=>{
  const nav=useNavigate();const[sp]=useSearchParams();const eid=sp.get('edit');const ex=eid?getGameById(eid):null;
  const[name,setName]=useState(ex?.name||'');
  const[trail,setTrail]=useState<TrailPoint[]>(ex?.trail||[]);
  const[step,setStep]=useState<'cfg'|'drop'>('cfg');
  const[pos,setPos]=useState<{lat:number;lng:number;accuracy:number}|null>(null);
  const[gpsErr,setGpsErr]=useState('');
  const[selecting,setSelecting]=useState(false);
  const[loading,setLoading]=useState(false);
  const[gpsUnstable,setGpsUnstable]=useState(false);
  const[pacesModal,setPacesModal]=useState<{idx:number;val:number}|null>(null);

  const getGps=useCallback(async()=>{
    setLoading(true);setGpsErr('');
    try{const p=await getPos();setPos(p);setGpsUnstable(p.accuracy>15);}
    catch(e:unknown){setGpsErr(e instanceof Error?e.message:'定位失敗');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{if(step==='drop')getGps();},[step,getGps]);

  const drop=(signId:number)=>{
    if(!pos)return;
    const pt:TrailPoint={signId,lat:pos.lat,lng:pos.lng,timestamp:Date.now()};
    if(signId===9){setPacesModal({idx:trail.length,val:6});setTrail(p=>[...p,{...pt,paces:6}]);}
    else setTrail(p=>[...p,pt]);
    setSelecting(false);
  };

  const setPaces=(val:number)=>{
    if(!pacesModal)return;
    setTrail(p=>{const n=[...p];n[pacesModal.idx]={...n[pacesModal.idx],paces:val};return n;});
    setPacesModal(null);
  };

  const save=()=>{
    if(!name.trim()||trail.length<2)return;
    const g:GameConfig={id:ex?.id||genId(),name:name.trim(),trail,createdAt:ex?.createdAt||Date.now()};
    saveGame(g);nav('/leader');
  };

  return(
  <div className="min-h-[calc(100vh-5rem)] grid-bg">
    <div className="sticky top-0 z-40 bg-navy-950/90 backdrop-blur-xl border-b border-cyan/10">
      <div className="px-5 py-3 flex items-center gap-3">
        <button onClick={()=>step==='drop'?setStep('cfg'):nav('/leader')} className="p-2 -ml-2 rounded-xl text-steel hover:text-ice"><ArrowLeft size={20}/></button>
        <h1 className="font-heading font-bold text-lg text-ice">{step==='cfg'?'建立路線':'投放符號'}</h1>
      </div>
    </div>

    <AnimatePresence mode="wait">
    {step==='cfg'?(
      <motion.div key="c" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}} className="px-5 py-5 space-y-5">
        <div>
          <label className="block text-ice text-xs font-medium mb-1.5">路線名稱</label>
          <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="例：公園夜間追蹤" className="w-full px-4 py-3 bg-navy-800 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30"/>
        </div>
        <div>
          <label className="text-ice text-xs font-medium mb-1.5">追蹤路線 <span className="text-steel">({trail.length}個)</span></label>
          {trail.length>0?(
            <div className="bg-navy-800/70 rounded-xl border border-cyan/8 p-3 space-y-1.5">
              {trail.map((pt,i)=>{const s=trackingSigns.find(x=>x.id===pt.signId);return(
                <div key={i} className="flex items-center gap-2">
                  <span className="text-steel text-[10px] font-mono w-4">{i+1}</span>
                  <div className="w-7 h-7 flex items-center justify-center"><SignSVG signId={pt.signId} size={28} glow={false}/></div>
                  <span className="text-ice text-xs flex-1">{s?.nameZh}</span>
                  {pt.paces&&<span className="text-gold text-[10px] font-mono">{pt.paces}步</span>}
                  <button onClick={()=>setTrail(p=>p.filter((_,j)=>j!==i))} className="text-steel hover:text-red"><X size={12}/></button>
                </div>);
              })}
            </div>
          ):<div className="bg-navy-800/40 rounded-xl border border-dashed border-steel/30 p-6 text-center text-steel text-sm">尚未投放</div>}
        </div>
        <button onClick={()=>setStep('drop')} className="w-full py-3 bg-cyan-dark text-cyan rounded-xl font-heading font-semibold border border-cyan/20">開始投放</button>
        <button onClick={save} disabled={!name.trim()||trail.length<2} className={`w-full py-4 rounded-2xl font-heading font-bold text-lg flex items-center justify-center gap-2 ${name.trim()&&trail.length>=2?'bg-gradient-to-r from-cyan/20 to-green/10 text-cyan border border-cyan/30 box-glow-cyan':'bg-navy-800 text-steel/30 cursor-not-allowed border border-steel/10'}`}><Check size={20}/>儲存路線</button>
        {name.trim()&&trail.length>=2&&<p className="text-center text-steel/40 text-[10px] mt-2">路線將於 48 小時後自動刪除</p>}
      </motion.div>
    ):(
      <motion.div key="d" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} className="px-5 py-5">
        <div className="bg-navy-800/70 rounded-2xl border border-cyan/10 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${pos?'bg-green':gpsErr?'bg-red':'bg-cyan animate-blink'}`}/>
            <span className="text-sm text-ice">{pos?'GPS 已鎖定':gpsErr?'定位失敗':'定位中...'}</span>
            <button onClick={getGps} className="ml-auto p-1.5 rounded-lg bg-cyan-dark text-cyan hover:bg-cyan-dark/80"><Navigation size={14}/></button>
          </div>
          {pos&&<div className="text-[10px] text-steel font-mono">LAT {pos.lat.toFixed(6)} · LNG {pos.lng.toFixed(6)}</div>}
          {gpsErr&&<div className="text-[10px] text-red mt-1">{gpsErr}</div>}
          {gpsUnstable&&pos&&(
            <div className="mt-2 bg-gold/10 border border-gold/20 rounded-lg p-2.5 flex items-start gap-2">
              <AlertTriangle size={14} className="text-gold flex-shrink-0 mt-0.5"/>
              <div className="text-[10px] text-gold leading-relaxed">GPS 精度 ±{Math.round(pos.accuracy)}m — 建議移至空曠位置或稍等定位穩定後再投放，以免符號位置偏移。</div>
            </div>
          )}
        </div>

        {!selecting?(
          <div className="space-y-3">
            <button onClick={()=>setSelecting(true)} disabled={!pos} className={`w-full py-5 rounded-2xl font-heading font-bold text-lg flex items-center justify-center gap-3 ${pos?'bg-gradient-to-r from-cyan/20 to-green/10 text-cyan border border-cyan/30 box-glow-cyan':'bg-navy-800 text-steel/30 cursor-not-allowed border border-steel/10'}`}><Crosshair size={24}/>在此投放</button>
            {trail.length>0&&<button onClick={()=>setTrail(p=>p.slice(0,-1))} className="w-full py-3 bg-red/10 text-red rounded-xl font-heading font-semibold text-sm border border-red/20 flex items-center justify-center gap-2"><X size={14}/>移除最後</button>}
            {trail.length>=2&&<button onClick={()=>setStep('cfg')} className="w-full mt-2 py-4 bg-gradient-to-r from-cyan/20 to-green/10 text-cyan rounded-2xl font-heading font-bold text-lg border border-cyan/30 box-glow-cyan">完成投放 ({trail.length})</button>}
          </div>
        ):(
          <div>
            <p className="text-ice text-sm mb-3 font-heading font-semibold">選擇符號：</p>
            <div className="grid grid-cols-2 gap-2.5">
              {trackingSigns.map(s=>(
                <motion.button key={s.id} whileTap={{scale:.95}} onClick={()=>drop(s.id)} className="bg-navy-800 rounded-2xl border border-cyan/10 p-3 flex flex-col items-center gap-1.5 hover:border-cyan/30 transition-colors">
                  <SignSVG signId={s.id} size={44}/><div className="text-center"><div className="font-heading font-bold text-ice text-xs">{s.nameZh}</div><div className="text-steel text-[9px]">{s.nameEn}</div></div>
                  {s.isWarning&&<div className="text-[8px] px-1.5 py-0.5 rounded bg-red/10 text-red">警告</div>}
                </motion.button>
              ))}
            </div>
            <button onClick={()=>setSelecting(false)} className="w-full mt-3 py-3 bg-navy-800 text-steel rounded-xl text-sm border border-steel/10">取消</button>
          </div>
        )}
      </motion.div>
    )}
    </AnimatePresence>

    <AnimatePresence>{pacesModal&&(
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-navy-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <motion.div initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.8,opacity:0}} className="bg-navy-800 rounded-3xl border border-gold/20 p-6 w-full max-w-xs box-glow-cyan">
          <h3 className="font-heading font-bold text-ice text-lg mb-3">設定步數</h3>
          <p className="text-ice-dim text-xs mb-4">成員需走多少步才能找到信物？</p>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={()=>setPacesModal(p=>p?{...p,val:Math.max(1,p.val-1)}:null)} className="w-12 h-12 rounded-xl bg-navy-900 text-cyan text-xl font-bold flex items-center justify-center border border-cyan/20">−</button>
            <div className="flex-1 text-center"><span className="font-heading font-bold text-4xl text-gold glow-gold">{pacesModal.val}</span><div className="text-steel text-[10px]">步</div></div>
            <button onClick={()=>setPacesModal(p=>p?{...p,val:Math.min(99,p.val+1)}:null)} className="w-12 h-12 rounded-xl bg-navy-900 text-cyan text-xl font-bold flex items-center justify-center border border-cyan/20">+</button>
          </div>
          <div className="flex gap-2">
            {[3,6,10,15].map(n=><button key={n} onClick={()=>setPacesModal(p=>p?{...p,val:n}:null)} className={`flex-1 py-2 rounded-lg text-xs font-medium ${pacesModal.val===n?'bg-gold/20 text-gold border border-gold/30':'bg-navy-900 text-steel border border-steel/10'}`}>{n}步</button>)}
          </div>
          <button onClick={()=>setPaces(pacesModal.val)} className="w-full mt-4 py-3 bg-gradient-to-r from-gold/20 to-cyan/10 text-gold rounded-xl font-heading font-bold border border-gold/30">確認</button>
        </motion.div>
      </motion.div>
    )}</AnimatePresence>
  </div>);
};
export default LC;
