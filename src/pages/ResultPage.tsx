import React,{useEffect,useState}from'react';
import{useNavigate,useSearchParams}from'react-router-dom';
import{motion}from'framer-motion';
import{Home,RotateCcw,Star,Target}from'lucide-react';
import Confetti from'../components/Confetti';

const R:React.FC=()=>{
  const nav=useNavigate();const[sp]=useSearchParams();
  const score=parseInt(sp.get('score')||'0');const total=parseInt(sp.get('total')||'0');const correct=parseInt(sp.get('correct')||'0');const name=sp.get('name')||'玩家';
  const[confetti,setConfetti]=useState(false);
  const pct=total>0?Math.round((correct/total)*100):0;

  useEffect(()=>{if(pct>=60){setConfetti(true);const t=setTimeout(()=>setConfetti(false),4000);return()=>clearTimeout(t);}},[pct]);

  const grade=()=>{if(pct>=90)return{l:'卓越',e:'🏆',c:'text-gold'};if(pct>=70)return{l:'優秀',e:'⭐',c:'text-cyan'};if(pct>=50)return{l:'良好',e:'👍',c:'text-green'};if(pct>=30)return{l:'加油',e:'💪',c:'text-steel-light'};return{l:'再接再厲',e:'📚',c:'text-steel'};};
  const g=grade();

  return(<div className="min-h-screen bg-navy-950 flex items-center justify-center px-6">{confetti&&<Confetti/>}
    <motion.div initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}} transition={{duration:.5,type:'spring'}} className="w-full max-w-sm">
      <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:.3,type:'spring',stiffness:200}} className="text-center mb-6">
        <div className="text-7xl mb-2">{g.e}</div><div className={`font-heading font-bold text-3xl ${g.c} glow-cyan`}>{g.l}</div>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.5}} className="bg-navy-800 rounded-3xl border border-cyan/10 p-6 shadow-lg mb-5">
        <div className="text-center mb-4"><div className="text-steel text-sm mb-1">{name} 的成績</div><div className="font-heading font-bold text-5xl text-cyan glow-cyan">{score}</div><div className="text-steel text-sm">分</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-cyan-dark/30 rounded-xl p-3 text-center"><Target size={16} className="text-cyan mx-auto mb-1"/><div className="font-heading font-bold text-lg text-cyan">{correct}/{total}</div><div className="text-ice-dim text-[10px]">正確</div></div>
          <div className="bg-gold/10 rounded-xl p-3 text-center"><Star size={16} className="text-gold mx-auto mb-1"/><div className="font-heading font-bold text-lg text-gold">{pct}%</div><div className="text-ice-dim text-[10px]">正確率</div></div>
        </div>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.7}} className="bg-navy-800 rounded-2xl border border-cyan/5 p-4 mb-6">
        <div className="flex items-center justify-center"><div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="#0a1628" strokeWidth="10"/><motion.circle cx="60" cy="60" r="50" fill="none" stroke={pct>=70?'#00d4ff':pct>=50?'#ffd700':'#ff3366'} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${2*Math.PI*50}`} initial={{strokeDashoffset:2*Math.PI*50}} animate={{strokeDashoffset:2*Math.PI*50*(1-pct/100)}} transition={{duration:1,delay:.8}}/></svg>
          <div className="absolute inset-0 flex items-center justify-center"><div className="font-heading font-bold text-2xl text-ice">{pct}%</div></div>
        </div></div>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.9}} className="space-y-3">
        <button onClick={()=>nav('/quiz')} className="w-full py-4 bg-gradient-to-r from-gold/20 to-cyan/10 text-gold rounded-2xl font-heading font-bold text-lg flex items-center justify-center gap-2 border border-gold/30"><RotateCcw size={20}/>再玩一次</button>
        <button onClick={()=>nav('/')} className="w-full py-3 bg-navy-800 text-steel rounded-2xl font-heading font-semibold border border-steel/10 flex items-center justify-center gap-2 hover:text-ice"><Home size={18}/>返回首頁</button>
      </motion.div>
    </motion.div>
  </div>);
};
export default R;
