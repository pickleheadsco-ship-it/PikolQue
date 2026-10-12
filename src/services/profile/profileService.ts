import { useState, useEffect } from 'react';
import { SkillLevel } from '../../types';

export interface PlayerProfile {
  firstName: string;
  surname: string;
  displayName?: string;
  skillLevel: SkillLevel;
  avatarUrl?: string;
  updatedAt?: string;
}

export const PRESET_AVATARS = [
  { id: 'mascot', name: 'Clay Mascot', url: '/mascot.png' },
  { id: 'paddle', name: 'Pro Paddle', url: '/clay_paddle.png' },
  { id: 'ball', name: 'Pickleball', url: '/clay_pickleball.png' },
  { id: 'whistle', name: 'Whistle', url: '/clay_whistle.png' },
  { id: 'net', name: 'Court Net', url: '/clay_net.png' },
];

const STORAGE_KEY = 'picklequeue_player_profile';
const PROFILE_CHANGE_EVENT = 'picklequeue_profile_updated';

export const profileService = {
  getProfile(): PlayerProfile {
    try {
      if (typeof window === 'undefined') {
        return { firstName: '', surname: '', skillLevel: 'intermediate', avatarUrl: '' };
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          firstName: parsed.firstName || '',
          surname: parsed.surname || '',
          displayName: parsed.displayName || `${parsed.firstName || ''} ${parsed.surname || ''}`.trim(),
          skillLevel: parsed.skillLevel || 'intermediate',
          avatarUrl: parsed.avatarUrl || '',
          updatedAt: parsed.updatedAt,
        };
      }
    } catch (err) {
      console.warn('Error reading player profile:', err);
    }
    return { firstName: '', surname: '', skillLevel: 'intermediate', avatarUrl: '' };
  },

  saveProfile(profile: Partial<PlayerProfile>): PlayerProfile {
    const current = this.getProfile();
    const updated: PlayerProfile = {
      ...current,
      ...profile,
      displayName: `${profile.firstName ?? current.firstName} ${profile.surname ?? current.surname}`.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(PROFILE_CHANGE_EVENT, { detail: updated }));
    } catch (err) {
      console.warn('Error saving player profile to localStorage:', err);
    }
    return updated;
  },

  /**
   * Resizes and compresses an image file to a lightweight data URL (max 320x320)
   * so it is fast, portable, and persists in localStorage / Firestore seamlessly.
   */
  async processImageFile(file: File, maxDimension = 320, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.'));
        return;
      }

      // Check max input file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('Image file is too large. Please select a file under 10MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not process image on this device.'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Unable to read selected image.'));
        img.src = readerEvent.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Error reading image file.'));
      reader.readAsDataURL(file);
    });
  },
};

/**
 * Custom React hook for reactive player profile state across any component
 */
export function usePlayerProfile() {
  const [profile, setProfileState] = useState<PlayerProfile>(() => profileService.getProfile());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PlayerProfile>;
      if (customEvent.detail) {
        setProfileState(customEvent.detail);
      } else {
        setProfileState(profileService.getProfile());
      }
    };

    window.addEventListener(PROFILE_CHANGE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(PROFILE_CHANGE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateProfile = (updates: Partial<PlayerProfile>) => {
    const next = profileService.saveProfile(updates);
    setProfileState(next);
    return next;
  };

  const updateAvatar = (avatarUrl: string) => {
    return updateProfile({ avatarUrl });
  };

  return {
    profile,
    updateProfile,
    updateAvatar,
  };
}
