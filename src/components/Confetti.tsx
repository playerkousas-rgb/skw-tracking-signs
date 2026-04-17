import React,{useEffect,useState}from'react';

interface P{pieces?:number}
const cols=['#00d4ff','#00ff88','#ffd700','#ff3366','#0a4a6b','#5a7a98'];

const Confetti:React.FC<P>=({pieces=35})=>{
  const[ps,setPs]=useState<{id:number;l:number;d:number;c:string;s:number;du:number}[]>([]);
  useEffect(()=>{
    setPs(Array.from({length:pieces},(_,i)=>({
      id:i,
      l:Math.random()*100,
      d:Math.random()*1.5,
      c:cols[Math.floor(Math.random()*cols.length)],
      s:Math.random()*8+4,
      du:Math.random()*2+2
    })));
  },[pieces]);

  return(
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {ps.map(p=>(
        <div
          key={p.id}
          className="confetti-piece absolute"
          style={{
            left:`${p.l}%`,
            top:'-10px',
            width:`${p.s}px`,
            height:`${p.s}px`,
            backgroundColor:p.c,
            borderRadius:p.s>8?'50%':'2px',
            animationDelay:`${p.d}s`,
            animationDuration:`${p.du}s`,
          }}
        />
      ))}
    </div>
  );
};
export default Confetti;
