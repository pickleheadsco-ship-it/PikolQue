import React, { useState, useRef, useEffect } from 'react';
import {
  usePlayerProfile,
  profileService,
  PlayerProfile,
} from '../../services/profile/profileService';
import { SkillLevel } from '../../types';
import { firePickleballBurst } from '../../services/fx/pickleballBurst';
import {
  updateParticipantProfile,
  updateParticipantAvatar,
} from '../../services/sessions/sessionService';
import {
  X,
  Camera,
  Upload,
  Trash2,
  Check,
  User,
  Sparkles,
  ShieldCheck,
  Smile,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  participantId?: string;
  onSaved?: (profile: PlayerProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  participantId,
  onSaved,
}) => {
  const { profile, updateProfile } = usePlayerProfile();

  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [surname, setSurname] = useState(profile.surname || '');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(profile.skillLevel || 'intermediate');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl || '');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFirstName(profile.firstName || '');
      setSurname(profile.surname || '');
      setSkillLevel(profile.skillLevel || 'intermediate');
      setAvatarUrl(profile.avatarUrl || '');
    }
  }, [isOpen, profile.firstName, profile.surname, profile.skillLevel, profile.avatarUrl]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setError(null);
    try {
      const dataUrl = await profileService.processImageFile(file, 320, 0.88);
      setAvatarUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'Could not process the selected image.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = firstName.trim();
    const cleanSurname = surname.trim();

    const updatedProfile = updateProfile({
      firstName: cleanFirst,
      surname: cleanSurname,
      skillLevel,
      avatarUrl,
    });

    // If currently inside an active session, sync avatar and profile directly to Firestore
    if (sessionId && participantId) {
      try {
        const fullName = `${cleanFirst} ${cleanSurname}`.trim() || undefined;
        await updateParticipantProfile(sessionId, participantId, {
          name: fullName,
          firstName: cleanFirst || undefined,
          surname: cleanSurname || undefined,
          skillLevel,
          avatarUrl,
        });
      } catch (err) {
        console.warn('Could not sync profile to live session:', err);
      }
    }

    firePickleballBurst(window.innerWidth / 2, window.innerHeight / 2);
    setSavedSuccess(true);

    if (onSaved) {
      onSaved(updatedProfile);
    }

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const initials = firstName
    ? `${firstName.charAt(0)}${surname.charAt(0) || ''}`.toUpperCase()
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="clay-card rounded-3xl max-w-md w-full bg-white overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-black text-base text-white tracking-tight leading-tight">
                Player Profile & Photo
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                Photo reflects next to the logo & on the queue
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {/* Photo Upload Area */}
          <div className="text-center space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
              Profile Photo
            </span>

            <div className="flex flex-col items-center justify-center">
              <div className="relative group">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden clay-card p-1.5 bg-white flex items-center justify-center transition-all group-hover:scale-102"
                  style={{
                    boxShadow:
                      '8px 10px 24px rgba(148, 163, 184, 0.4), -6px -6px 16px rgba(255, 255, 255, 0.95), inset 2px 2px 4px rgba(255, 255, 255, 0.9)',
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : initials ? (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-2xl flex items-center justify-center shadow-inner">
                      {initials}
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                      <User className="w-10 h-10 text-slate-400" />
                    </div>
                  )}

                  {isProcessingImage && (
                    <div className="absolute inset-0 bg-slate-900/60 rounded-3xl flex items-center justify-center text-white text-xs font-bold">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Floating Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-2 border-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Upload image from device"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-center gap-2 mt-3.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl clay-btn clay-btn-secondary text-xs font-black text-slate-700 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Upload Photo</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 rounded-xl clay-btn clay-btn-secondary text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-3.5 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Surname
              </label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="e.g. Henderson"
                className="w-full px-3.5 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Skill Level Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Skill Level
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Used for balanced games</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((level) => {
                const isSelected = skillLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSkillLevel(level)}
                    className={`py-2 rounded-2xl capitalize text-xs font-black transition-all clay-btn cursor-pointer ${
                      isSelected
                        ? level === 'beginner'
                          ? 'clay-btn-secondary text-sky-800 ring-2 ring-sky-500'
                          : level === 'intermediate'
                          ? 'clay-btn-primary text-white shadow-md'
                          : 'clay-btn-amber text-white shadow-md'
                        : 'clay-btn-secondary text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all clay-btn flex items-center justify-center gap-2 cursor-pointer ${
                savedSuccess ? 'bg-emerald-600 text-white' : 'clay-btn-primary text-white shadow-lg'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Profile Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
