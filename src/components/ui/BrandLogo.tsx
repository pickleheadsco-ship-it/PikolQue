import React from 'react';
import { firePickleballBurst } from '../../services/fx/pickleballBurst';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  interactive = true,
  onClick,
}) => {
  const sizeMap = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-18 h-18',
    xl: 'w-28 h-28',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (interactive) {
      firePickleballBurst(e.clientX, e.clientY);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${interactive ? 'cursor-pointer select-none' : ''} ${className}`}
      onClick={handleClick}
      title={interactive ? 'Pickleheads Brand Logo (Click to burst pickleballs! 🎾)' : undefined}
    >
      <div
        className={`${sizeMap[size]} rounded-2xl overflow-hidden clay-card p-1 shrink-0 flex items-center justify-center transform transition-all ${
          interactive ? 'hover:scale-105 hover:-translate-y-0.5 active:scale-95' : ''
        } bg-white`}
        style={{
          boxShadow:
            '6px 8px 18px rgba(148, 163, 184, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.9), inset -1.5px -1.5px 4px rgba(203, 213, 225, 0.3)',
        }}
      >
        <img
          src="/logo.png"
          alt="Pickleheads Brand Logo"
          className="w-full h-full object-contain rounded-xl"
          referrerPolicy="no-referrer"
          draggable={false}
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-black text-slate-900 tracking-tight text-base sm:text-lg leading-tight">
            PickleQueue
          </span>
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">
            Live Open-Play
          </span>
        </div>
      )}
    </div>
  );
};
