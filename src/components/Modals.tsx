import React,{useState,useEffect}from'react';
import Confetti from'./Confetti';

interface P{show:boolean;onClose:()=>void;title:string;children:React.ReactNode}
export const Modal:React.FC<P>=({show,onClose,title,children})=>{
  if(!show)return null;
  return(
    <div className="fixed inset-0 bg-navy-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="bg-navy-800 rounded-3xl border border-cyan/20 p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto box-glow-cyan">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-ice text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-steel hover:text-ice rounded-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export{Confetti};
