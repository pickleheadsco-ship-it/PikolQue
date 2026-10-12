import React, { useState, useRef, useEffect } from 'react';
import {
  usePlayerProfile,
  profileService,
  PlayerProfile,
} from '../services/profile/profileService';
import { SkillLevel } from '../types';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ProfileAvatarBadge } from '../components/profile/ProfileAvatarBadge';
import { firePickleballBurst } from '../services/fx/pickleballBurst';
import {
  updateParticipantProfile,
} from '../services/sessions/sessionService';
import {
  ArrowLeft,
  Camera,
  Upload,
  Trash2,
  Check,
  User,
  Sparkles,
  ShieldCheck,
  Trophy,
  CheckCircle,
  Eye,
  Info,
} from 'lucide-react';

interface ProfilePageProps {
  onBack: () => void;
  sessionId?: string | null;
  participantId?: string | null;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onBack,
  sessionId,
  participantId,
}) => {
  const { profile, updateProfile } = usePlayerProfile();

  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [surname, setSurname] = useState(profile.surname || '');
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(profile.skillLevel || 'intermediate');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if profile changes externally
  useEffect(() => {
    setFirstName(profile.firstName || '');
    setSurname(profile.surname || '');
    setDisplayName(profile.displayName || '');
    setSkillLevel(profile.skillLevel || 'intermediate');
    setAvatarUrl(profile.avatarUrl || '');
  }, [profile.avatarUrl, profile.firstName, profile.surname, profile.displayName, profile.skillLevel]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const dataUrl = await profileService.processImageFile(file, 320, 0.88);
      setAvatarUrl(dataUrl);
      // Auto-save image immediately to local profile so it reflects right away
      updateProfile({ avatarUrl: dataUrl });
      firePickleballBurst(window.innerWidth / 2, 200);
    } catch (err: any) {
      setError(err?.message || 'Could not process the selected image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    updateProfile({ avatarUrl: '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = firstName.trim();
    const cleanSurname = surname.trim();
    const computedDisplay = displayName.trim() || `${cleanFirst} ${cleanSurname}`.trim();

    const updated = updateProfile({
      firstName: cleanFirst,
      surname: cleanSurname,
      displayName: computedDisplay,
      skillLevel,
      avatarUrl,
    });

    // Check if session ID and participant ID exist in active context or storage
    const activeSessionId =
      sessionId ||
      localStorage.getItem('picklequeue_participant_session_id') ||
      undefined;
    const activeParticipantId =
      participantId ||
      localStorage.getItem('picklequeue_participant_id') ||
      undefined;

    if (activeSessionId && activeParticipantId) {
      try {
        await updateParticipantProfile(activeSessionId, activeParticipantId, {
          name: computedDisplay || undefined,
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

    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const initials = firstName
    ? `${firstName.charAt(0)}${surname.charAt(0) || ''}`.toUpperCase()
    : '';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white/85 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/60 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded-2xl clay-btn clay-btn-secondary text-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">Player Profile & Photo</span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-xl bg-emerald-100 text-emerald-800 clay-pill">
              Live
            </span>
          </div>

          <div className="w-16 flex justify-end">
            <ProfileAvatarBadge
              size="xs"
              onClick={() => {}}
            />
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="max-w-xl mx-auto w-full p-4 sm:p-6 space-y-5 my-auto">
        {/* Header Preview Highlight: Right Side of the Logo */}
        <div className="clay-card rounded-3xl p-5 text-center space-y-2 border border-emerald-100 shadow-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-black uppercase tracking-wider clay-pill">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Header Live Reflection</span>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
            Your uploaded photo reflects directly on the <strong>right side of the logo</strong> across all screens:
          </p>

          {/* Real-time Visual Reflection Showcase */}
          <div className="pt-2 pb-1 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-50 clay-inset border border-slate-200/60 max-w-xs w-full">
              {/* Logo */}
              <div className="flex flex-col items-center">
                <BrandLogo size="md" />
                <span className="text-[9px] font-bold text-slate-400 mt-1">Logo</span>
              </div>

              {/* Arrow */}
              <span className="text-emerald-500 font-black text-sm">➔</span>

              {/* Uploaded Image on the Right Side of the Logo */}
              <div className="flex flex-col items-center">
                <ProfileAvatarBadge
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                />
                <span className="text-[9px] font-bold text-emerald-700 mt-1">
                  {avatarUrl ? 'Your Photo' : 'Add Photo'}
                </span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-base font-black text-slate-900 tracking-tight block">PickleQueue</span>
              <span className="text-[10px] text-slate-500 font-medium">Live Court Queue System</span>
            </div>
          </div>
        </div>

        {/* Profile Card & Form */}
        <div className="clay-card rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile and photo updated successfully! Reflected next to the logo.</span>
            </div>
          )}

          {/* Photo Management Section */}
          <div className="text-center space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Player Photo / Avatar
            </label>

            <div className="flex flex-col items-center justify-center">
              <div className="relative group">
                <div
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden clay-card p-1.5 bg-white flex items-center justify-center transition-all group-hover:scale-102"
                  style={{
                    boxShadow:
                      '8px 10px 24px rgba(148, 163, 184, 0.4), -6px -6px 16px rgba(255, 255, 255, 0.95), inset 2px 2px 4px rgba(255, 255, 255, 0.9)',
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Player profile"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : initials ? (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-3xl flex items-center justify-center shadow-inner">
                      {initials}
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                      <User className="w-12 h-12 text-slate-400" />
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-900/60 rounded-3xl flex items-center justify-center text-white text-xs font-bold">
                      <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Camera Overlay Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-2 border-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Upload / Take Photo"
                  aria-label="Upload photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Upload & Remove Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl clay-btn clay-btn-primary text-xs font-black text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3.5 py-2 rounded-xl clay-btn clay-btn-secondary text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Form Fields */}
          <form onSubmit={handleSave} className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-emerald-500"
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
                  className="w-full px-3.5 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How your name appears on queue table"
                className="w-full px-3.5 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-emerald-500"
              />
            </div>

            {/* Skill Level Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Skill Level
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Used for balanced match pairing</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((level) => {
                  const isSelected = skillLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSkillLevel(level)}
                      className={`py-2.5 rounded-2xl capitalize text-xs font-black transition-all clay-btn cursor-pointer ${
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

            {/* Save Button */}
            <div className="pt-3">
              <button
                type="submit"
                className={`w-full py-4 rounded-2xl text-xs font-black transition-all clay-btn flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                  savedSuccess ? 'bg-emerald-600 text-white' : 'clay-btn-primary text-white'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Profile & Photo Saved!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
