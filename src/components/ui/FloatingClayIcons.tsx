import React, { useState } from 'react';
import { firePickleballBurst } from '../../services/fx/pickleballBurst';

export interface FloatingClayItem {
  id: string;
  name: string;
  image: string;
  top: string;
  left?: string;
  right?: string;
  size: string;
  delay: string;
  duration: string;
  rotate: string;
}

const FLOATING_ITEMS: FloatingClayItem[] = [
  // 1. Top-Left: 3D Clay Paddle
  {
    id: 'clay-paddle-1',
    name: '3D Clay Paddle',
    image: '/clay_paddle.png',
    top: '12%',
    left: '3%',
    size: 'w-16 h-16 sm:w-22 sm:h-22 md:w-28 md:h-28 lg:w-32 lg:h-32',
    delay: '0.4s',
    duration: '5.2s',
    rotate: '-12deg',
  },
  // 2. Top-Right: 3D Clay Pickleball
  {
    id: 'clay-ball-1',
    name: '3D Clay Pickleball',
    image: '/clay_pickleball.png',
    top: '15%',
    right: '3.5%',
    size: 'w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
    delay: '1.0s',
    duration: '4.6s',
    rotate: '10deg',
  },
  // 3. Mid-Left: 3D Clay Whistle
  {
    id: 'clay-whistle-1',
    name: '3D Clay Whistle',
    image: '/clay_whistle.png',
    top: '47%',
    left: '2.5%',
    size: 'w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
    delay: '1.6s',
    duration: '4.8s',
    rotate: '-15deg',
  },
  // 4. Mid-Right: 3D Clay Court Net
  {
    id: 'clay-net-1',
    name: '3D Clay Court Net',
    image: '/clay_net.png',
    top: '50%',
    right: '2.5%',
    size: 'w-16 h-16 sm:w-22 sm:h-22 md:w-28 md:h-28 lg:w-32 lg:h-32',
    delay: '0.8s',
    duration: '5.5s',
    rotate: '8deg',
  },
  // 5. Bottom-Left: 3D Clay Pickleball
  {
    id: 'clay-ball-2',
    name: '3D Clay Pickleball',
    image: '/clay_pickleball.png',
    top: '80%',
    left: '3%',
    size: 'w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
    delay: '2.2s',
    duration: '4.4s',
    rotate: '-8deg',
  },
  // 6. Bottom-Right: 3D Clay Paddle
  {
    id: 'clay-paddle-2',
    name: '3D Clay Paddle',
    image: '/clay_paddle.png',
    top: '82%',
    right: '3%',
    size: 'w-16 h-16 sm:w-22 sm:h-22 md:w-28 md:h-28 lg:w-32 lg:h-32',
    delay: '2.8s',
    duration: '5.0s',
    rotate: '15deg',
  },
];

export const FloatingClayIcons: React.FC = () => {
  const [poppedId, setPoppedId] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent, item: FloatingClayItem) => {
    e.stopPropagation();
    firePickleballBurst(e.clientX, e.clientY);
    setPoppedId(item.id);
    setTimeout(() => setPoppedId(null), 450);
  };

  return (
    <aside 
      aria-label="Background floating 3D clay icons"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {FLOATING_ITEMS.map((item) => {
        const isPopping = poppedId === item.id;

        return (
          <div
            key={item.id}
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              animationDelay: item.delay,
              animationDuration: item.duration,
            }}
            className={`absolute pointer-events-auto cursor-pointer animate-float transition-all select-none opacity-90 hover:opacity-100 max-sm:opacity-50 max-sm:scale-80 touch-manipulation ${
              isPopping ? 'scale-125 brightness-110 !opacity-100' : 'hover:scale-115 hover:-translate-y-1.5 active:scale-95'
            }`}
            onClick={(e) => handleClick(e, item)}
            title={`Click to burst pickleballs! (${item.name})`}
            aria-label={`${item.name} - click to burst pickleballs`}
          >
            {/* Direct floating 3D clay object — NO FRAME */}
            <div
              className={`${item.size} relative flex items-center justify-center transition-transform duration-300`}
              style={{
                transform: `rotate(${item.rotate})`,
              }}
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-contain select-none pointer-events-none drop-shadow-md sm:drop-shadow-lg hover:drop-shadow-xl transition-all duration-300 filter"
                referrerPolicy="no-referrer"
                draggable={false}
              />
            </div>
          </div>
        );
      })}
    </aside>
  );
};

