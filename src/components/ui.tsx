import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';

/* ── 頁首 ── */
export const PageHeader: React.FC<{
  kicker?: string;
  title: string;
  sub?: string;
  back?: () => void;
  right?: React.ReactNode;
}> = ({ kicker, title, sub, back, right }) => (
  <header className="flex items-start gap-3 pb-1">
    {back && (
      <button
        onClick={back}
        aria-label="返回"
        className="press mt-0.5 -ml-1 w-9 h-9 rounded-full border border-ink/15 bg-paper-2/70 flex items-center justify-center text-ink-2"
      >
        <ArrowLeft size={17} />
      </button>
    )}
    <div className="flex-1 min-w-0">
      {kicker && <p className="stamp text-clay inline-block mb-1">{kicker}</p>}
      <h1 className="text-[22px] leading-tight text-ink">{title}</h1>
      {sub && <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">{sub}</p>}
    </div>
    {right}
  </header>
);

/* ── 卡片 ── */
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  flat?: boolean;
}> = ({ children, className = '', onClick, flat }) => {
  const cls = `${flat ? 'card-flat' : 'card'} ${onClick ? 'press cursor-pointer' : ''} ${className}`;
  if (onClick) {
    return <button onClick={onClick} className={`${cls} text-left w-full block`}>{children}</button>;
  }
  return <div className={cls}>{children}</div>;
};

/* ── 按鈕 ── */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const btnStyles: Record<BtnVariant, string> = {
  primary: 'bg-forest text-paper border-forest-2 shadow-[0_8px_18px_-10px_rgba(29,49,35,0.9)]',
  secondary: 'bg-paper-2/80 text-forest border-forest/25',
  ghost: 'bg-transparent text-ink-3 border-ink/15',
  danger: 'bg-clay/10 text-clay-2 border-clay/30',
};

export const Btn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  icon?: React.ReactNode;
}> = ({ children, onClick, variant = 'primary', className = '', disabled, type = 'button', icon }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`press w-full h-12 rounded-2xl border font-body font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none ${btnStyles[variant]} ${className}`}
  >
    {icon}
    {children}
  </button>
);

/* ── 小標籤 ── */
export const Chip: React.FC<{
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  tone?: 'forest' | 'clay' | 'gold' | 'ink';
}> = ({ children, active, onClick, tone = 'forest' }) => {
  const tones = {
    forest: 'text-forest border-forest/25 bg-forest/5',
    clay: 'text-clay-2 border-clay/25 bg-clay/5',
    gold: 'text-gold border-gold/30 bg-gold/5',
    ink: 'text-ink-3 border-ink/15 bg-ink/5',
  };
  return (
    <button
      onClick={onClick}
      className={`press shrink-0 px-3 h-8 rounded-full border text-[11px] font-medium transition-colors ${
        active ? 'bg-forest text-paper border-forest' : tones[tone]
      }`}
    >
      {children}
    </button>
  );
};

/* ── 數據格 ── */
export const Stat: React.FC<{ value: React.ReactNode; label: string; tone?: string }> = ({
  value, label, tone = 'text-ink',
}) => (
  <div className="text-center flex-1">
    <div className={`text-[17px] font-mono font-bold leading-none ${tone}`}>{value}</div>
    <div className="text-[9px] text-ink-4 mt-1 tracking-wider">{label}</div>
  </div>
);

/* ── 底部彈出面板 ── */
export const Sheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxH?: string;
}> = ({ open, onClose, title, children, maxH = '88vh' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-end justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" />
        <motion.div
          initial={{ y: '8%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '10%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg paper-grain rounded-t-[26px] border-t border-ink/15 shadow-[0_-12px_40px_-12px_rgba(38,33,26,0.5)] pb-safe"
          style={{ maxHeight: maxH }}
        >
          <div className="pt-2.5 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-ink/20" />
          </div>
          {title && (
            <div className="flex items-center justify-between px-5 pb-2">
              <h3 className="text-[16px] text-ink">{title}</h3>
              <button onClick={onClose} className="press w-8 h-8 rounded-full border border-ink/15 flex items-center justify-center text-ink-3" aria-label="關閉">
                <X size={16} />
              </button>
            </div>
          )}
          <div className="overflow-y-auto no-scrollbar px-5 pb-6" style={{ maxHeight: `calc(${maxH} - 64px)` }}>
            {children}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ── 空狀態 ── */
export const Empty: React.FC<{ icon?: React.ReactNode; title: string; sub?: string }> = ({ icon, title, sub }) => (
  <div className="text-center py-12 px-6">
    <div className="mx-auto w-14 h-14 rounded-2xl border border-dashed border-ink/20 flex items-center justify-center text-ink-4 mb-3">
      {icon}
    </div>
    <p className="text-[13px] text-ink-2 font-medium">{title}</p>
    {sub && <p className="text-[11px] text-ink-4 mt-1 leading-relaxed">{sub}</p>}
  </div>
);

/* ── 手寫式備註 ── */
export const Note: React.FC<{ children: React.ReactNode; tone?: 'warn' | 'info' }> = ({ children, tone = 'info' }) => (
  <div className={`stitch px-3 py-2.5 text-[11px] leading-relaxed ${
    tone === 'warn' ? 'text-clay-2 bg-clay/5 border-clay/25' : 'text-ink-3 bg-paper-2/50'
  }`}>
    {children}
  </div>
);
