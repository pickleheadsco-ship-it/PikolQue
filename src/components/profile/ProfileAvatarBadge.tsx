import React from 'react';
import { usePlayerProfile } from '../../services/profile/profileService';
import { Camera, User, Sparkles } from 'lucide-react';

interface ProfileAvatarBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showTooltip?: boolean;
}

export const ProfileAvatarBadge: React.FC<ProfileAvatarBadgeProps> = ({
  size = 'md',
  className = '',
  onClick,
  showTooltip = true,
}) => {
  const { profile } = usePlayerProfile();

  const sizeMap = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-18 h-18',
    xl: 'w-28 h-28',
  };

  const cameraIconSizeMap = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  const badgeOffsetMap = {
    xs: '-bottom-0.5 -right-0.5 p-0.5',
    sm: '-bottom-1 -right-1 p-0.5',
    md: '-bottom-1 -right-1 p-1',
    lg: '-bottom-1.5 -right-1.5 p-1.5',
    xl: '-bottom-2 -right-2 p-2',
  };

  const hasAvatar = Boolean(profile.avatarUrl);
  const initials = profile.firstName
    ? `${profile.firstName.charAt(0)}${profile.surname?.charAt(0) || ''}`.toUpperCase()
    : '';

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 cursor-pointer select-none group transform transition-all hover:scale-105 hover:-translate-y-0.5 active:scale-95 ${className}`}
      title={showTooltip ? 'Your Player Profile & Photo (Click to change)' : undefined}
      aria-label="Player Profile Photo"
    >
      <div
        className={`${sizeMap[size]} rounded-2xl overflow-hidden clay-card p-1 flex items-center justify-center bg-white transition-all`}
        style={{
          boxShadow:
            '6px 8px 18px rgba(148, 163, 184, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.9), inset -1.5px -1.5px 4px rgba(203, 213, 225, 0.3)',
        }}
      >
        {hasAvatar ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName || 'Player profile'}
            className="w-full h-full object-cover rounded-xl"
            draggable={false}
          />
        ) : initials ? (
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black flex items-center justify-center text-sm sm:text-base tracking-wider shadow-inner">
            {initials}
          </div>
        ) : (
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 flex flex-col items-center justify-center border border-dashed border-slate-300 group-hover:border-emerald-400 transition-colors">
            <User className="w-1/2 h-1/2 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        )}
      </div>

      {/* Floating Action Badge: Camera overlay */}
      <div
        className={`absolute ${badgeOffsetMap[size]} rounded-full bg-emerald-600 text-white shadow-md border-2 border-white flex items-center justify-center group-hover:bg-emerald-700 group-hover:scale-110 transition-all`}
      >
        <Camera className={cameraIconSizeMap[size]} />
      </div>

      {/* Online / Active Indicator Dot */}
      {hasAvatar && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-200" />
      )}
    </div>
  );
};
