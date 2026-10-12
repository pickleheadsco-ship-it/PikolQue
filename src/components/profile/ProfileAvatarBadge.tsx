import React, { useRef } from 'react';
import { usePlayerProfile, profileService } from '../../services/profile/profileService';
import { firePickleballBurst } from '../../services/fx/pickleballBurst';
import { Camera, User, Plus } from 'lucide-react';

interface ProfileAvatarBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showTooltip?: boolean;
  allowDirectUpload?: boolean;
}

export const ProfileAvatarBadge: React.FC<ProfileAvatarBadgeProps> = ({
  size = 'md',
  className = '',
  onClick,
  showTooltip = true,
  allowDirectUpload = true,
}) => {
  const { profile, updateProfile } = usePlayerProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeMap: Record<string, string> = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    xl: 'w-24 h-24 sm:w-28 sm:h-28',
  };

  const cameraIconSizeMap: Record<string, string> = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  const badgeOffsetMap: Record<string, string> = {
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      // Default behavior: navigate to /profile page
      window.history.pushState({}, '', '/profile');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allowDirectUpload && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (onClick) {
      onClick();
    }
  };

  const handleDirectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await profileService.processImageFile(file, 320, 0.88);
      updateProfile({ avatarUrl: dataUrl });
      firePickleballBurst(window.innerWidth / 2, 200);
    } catch (err: any) {
      console.warn('Error uploading photo:', err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center shrink-0 cursor-pointer select-none group transform transition-all hover:scale-105 hover:-translate-y-0.5 active:scale-95 ${className}`}
      title={
        showTooltip
          ? hasAvatar
            ? 'Your Player Profile & Photo (Click to edit or change photo)'
            : 'Click to upload your player photo & profile'
          : undefined
      }
      aria-label="Player Profile Photo"
    >
      {/* Hidden File Input for Direct Upload */}
      {allowDirectUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleDirectFileChange}
          className="hidden"
        />
      )}

      {/* Main Avatar Container */}
      <div
        className={`${sizeMap[size] || sizeMap.md} rounded-2xl overflow-hidden clay-card p-1 flex items-center justify-center bg-white transition-all`}
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
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black flex items-center justify-center text-xs sm:text-sm tracking-wider shadow-inner">
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
        onClick={handleCameraClick}
        className={`absolute ${badgeOffsetMap[size] || badgeOffsetMap.md} rounded-full bg-emerald-600 text-white shadow-md border-2 border-white flex items-center justify-center group-hover:bg-emerald-700 group-hover:scale-110 transition-all cursor-pointer`}
        title="Upload or change player photo"
      >
        {hasAvatar ? (
          <Camera className={cameraIconSizeMap[size] || cameraIconSizeMap.md} />
        ) : (
          <Plus className={cameraIconSizeMap[size] || cameraIconSizeMap.md} />
        )}
      </div>

      {/* Online / Active Indicator Dot */}
      {hasAvatar && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-200" />
      )}
    </div>
  );
};
