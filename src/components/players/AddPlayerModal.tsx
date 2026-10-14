import React, { useState, useEffect } from 'react';
import { SkillLevel, ClubMember } from '../../types';
import { UserPlus, Upload, X, Link as LinkIcon, RefreshCw, CheckCircle2, Users } from 'lucide-react';
import { joinSessionAsParticipant, bulkImportParticipants } from '../../services/sessions/sessionService';
import { fetchAndSyncReclubFromUrl, getClubMembers } from '../../services/reclub/reclubSyncService';

interface AddPlayerModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  sessionId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'single' | 'bulk' | 'reclub'>('single');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [bulkText, setBulkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reclub Event / Group link state
  const [reclubUrl, setReclubUrl] = useState('');
  const [isFetchingReclub, setIsFetchingReclub] = useState(false);
  const [reclubSuccessMsg, setReclubSuccessMsg] = useState<string | null>(null);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [selectedClubMemberIds, setSelectedClubMemberIds] = useState<Set<string>>(new Set());
  const [loadingClubMembers, setLoadingClubMembers] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'reclub') {
      loadClubRoster();
    }
  }, [isOpen, mode]);

  const loadClubRoster = async () => {
    setLoadingClubMembers(true);
    try {
      const members = await getClubMembers();
      setClubMembers(members.filter((m) => m.status === 'active'));
    } catch {
      // ignore
    } finally {
      setLoadingClubMembers(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = firstName.trim();
    const cleanSurname = surname.trim();
    if (!cleanFirst || !cleanSurname) {
      setError('Please provide both First Name and Surname.');
      return;
    }
    const fullName = `${cleanFirst} ${cleanSurname}`;

    setIsSubmitting(true);
    setError(null);
    try {
      await joinSessionAsParticipant(sessionId, {
        name: fullName,
        firstName: cleanFirst,
        surname: cleanSurname,
        skillLevel,
      });
      setFirstName('');
      setSurname('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to check in player.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    // Split by newlines if multi-line, otherwise commas/semicolons
    const rawItems = bulkText.includes('\n')
      ? bulkText.split(/[\r\n]+/)
      : bulkText.split(/[,;]+/);
    const names = rawItems
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) {
      setError('Please paste or type at least one player name.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await bulkImportParticipants(sessionId, names, skillLevel);
      setBulkText('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Bulk import error:', err);
      setError(err?.message || 'Failed to bulk import players. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchAndAddReclub = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reclubUrl.trim();
    if (!trimmed) {
      setError('Please enter a Reclub event or group URL (e.g. https://reclub.co/events/... or https://reclub.co/groups/...)');
      return;
    }

    setIsFetchingReclub(true);
    setError(null);
    setReclubSuccessMsg(null);

    try {
      const res = await fetchAndSyncReclubFromUrl(trimmed);
      if (!res.success && res.errors && res.errors.length > 0) {
        throw new Error(res.errors[0]);
      }

      const confirmedMembers = res.syncedMembers || [];
      if (confirmedMembers.length === 0) {
        throw new Error('No confirmed players were found in this Reclub link. Please verify confirmed RSVPs or export data.');
      }

      // Automatically add each confirmed player to the active session queue
      let addedCount = 0;
      for (const m of confirmedMembers) {
        if (!m.name) continue;
        const nameParts = m.name.trim().split(/\s+/);
        const first = m.firstName || nameParts[0] || 'Player';
        const last = m.surname || nameParts.slice(1).join(' ') || '';
        await joinSessionAsParticipant(sessionId, {
          name: m.name.trim(),
          firstName: first,
          surname: last,
          avatarUrl: m.avatarUrl,
          skillLevel: m.skillLevel || 'intermediate',
        });
        addedCount++;
      }

      setReclubSuccessMsg(`Added ${addedCount} confirmed players from Reclub to the queue!`);
      setReclubUrl('');
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Reclub link sync error:', err);
      setError(err?.message || 'Failed to fetch confirmed players from Reclub link. Please verify URL is public.');
    } finally {
      setIsFetchingReclub(false);
    }
  };

  const toggleSelectMember = (id: string) => {
    setSelectedClubMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllMembers = () => {
    if (selectedClubMemberIds.size === clubMembers.length) {
      setSelectedClubMemberIds(new Set());
    } else {
      setSelectedClubMemberIds(new Set(clubMembers.map((m) => m.id)));
    }
  };

  const handleAddSelectedClubMembers = async () => {
    if (selectedClubMemberIds.size === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const toAdd = clubMembers.filter((m) => selectedClubMemberIds.has(m.id));
      for (const m of toAdd) {
        await joinSessionAsParticipant(sessionId, {
          name: m.name,
          firstName: m.firstName,
          surname: m.surname,
          avatarUrl: m.avatarUrl,
          skillLevel: m.skillLevel || 'intermediate',
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add selected club members.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="clay-card rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center clay-subcard">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Check In Players</h3>
              <p className="text-xs text-slate-500 font-medium">Add player to the live queue</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle with 3 Options */}
        <div className="mt-4 flex rounded-2xl clay-inset p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all clay-btn cursor-pointer ${
              mode === 'single' ? 'clay-btn-secondary text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all clay-btn cursor-pointer ${
              mode === 'bulk' ? 'clay-btn-secondary text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Bulk Paste
          </button>
          <button
            type="button"
            onClick={() => setMode('reclub')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all clay-btn flex items-center justify-center gap-1 cursor-pointer ${
              mode === 'reclub' ? 'clay-btn-secondary text-emerald-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <LinkIcon className="w-3 h-3 text-emerald-600" />
            <span>Reclub Link</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold">
            {error}
          </div>
        )}

        {reclubSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-2xl font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reclubSuccessMsg}</span>
          </div>
        )}

        {mode === 'single' ? (
          <form onSubmit={handleSubmitSingle} className="mt-4 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <div className="clay-inset rounded-2xl px-3.5 py-2.5">
                  <input
                    type="text"
                    required
                    maxLength={35}
                    placeholder="e.g. Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Surname <span className="text-rose-500">*</span>
                </label>
                <div className="clay-inset rounded-2xl px-3.5 py-2.5">
                  <input
                    type="text"
                    required
                    maxLength={35}
                    placeholder="e.g. Henderson"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Skill Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSkillLevel(lvl)}
                    className={`py-2.5 text-xs font-black rounded-2xl capitalize transition-all clay-btn ${
                      skillLevel === lvl
                        ? 'clay-btn-primary shadow-sm'
                        : 'clay-btn-secondary text-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !firstName.trim() || !surname.trim()}
                className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md disabled:opacity-40"
              >
                {isSubmitting ? 'Checking In...' : 'Add to Queue'}
              </button>
            </div>
          </form>
        ) : mode === 'bulk' ? (
          <form onSubmit={handleSubmitBulk} className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  Paste Player Names
                </label>
                {bulkText.trim().length > 0 && (
                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg clay-pill">
                    {bulkText.split(/[\r\n,;]+/).map((n) => n.trim()).filter(Boolean).length} Players Detected
                  </span>
                )}
              </div>
              <div className="clay-inset rounded-2xl p-2.5">
                <textarea
                  rows={5}
                  required
                  placeholder="Alex Henderson&#10;Ben Smith (Advanced)&#10;Carla Davis&#10;David Lee - Beginner"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                Tip: Paste one per line or separated by commas. Numbered lists (1. Alex) are automatically parsed.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Default Skill Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSkillLevel(lvl)}
                    className={`py-2.5 text-xs font-black rounded-2xl capitalize transition-all clay-btn cursor-pointer ${
                      skillLevel === lvl
                        ? 'clay-btn-primary shadow-sm'
                        : 'clay-btn-secondary text-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !bulkText.trim()}
                className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Importing...' : 'Bulk Check In'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Reclub Event / Group URL Direct Sync */
          <div className="mt-4 space-y-4">
            <form onSubmit={handleFetchAndAddReclub} className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Reclub Event or Group Link
                </label>
                <div className="clay-inset rounded-2xl px-3.5 py-2.5 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="url"
                    required
                    placeholder="https://reclub.co/events/xyz or reclub.co/groups/abc"
                    value={reclubUrl}
                    onChange={(e) => setReclubUrl(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                  {reclubUrl && (
                    <button
                      type="button"
                      onClick={() => setReclubUrl('')}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                  Paste any Reclub event, group, or club link. Confirmed players will be automatically fetched, deduplicated, and added straight to this live session queue.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFetchingReclub || !reclubUrl.trim()}
                  className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  {isFetchingReclub ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching Players...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Fetch & Add Confirmed Players</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick check-in from synced club roster */}
            {clubMembers.length > 0 && (
              <div className="pt-3 border-t border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-black text-slate-800">
                      Or Pick From Club Roster ({clubMembers.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={selectAllMembers}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {selectedClubMemberIds.size === clubMembers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 clay-inset rounded-2xl p-2">
                  {clubMembers.map((member) => {
                    const isChecked = selectedClubMemberIds.has(member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleSelectMember(member.id)}
                        className={`flex items-center justify-between p-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-100/70 text-emerald-950 font-black' : 'hover:bg-white/60 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded-sm text-emerald-600 accent-emerald-600 pointer-events-none"
                          />
                          <span>{member.name}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {member.skillLevel} {member.duprRating ? `(${member.duprRating})` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedClubMemberIds.size > 0 && (
                  <div className="mt-2.5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddSelectedClubMembers}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl clay-btn clay-btn-primary text-xs font-black shadow-sm cursor-pointer"
                    >
                      {isSubmitting ? 'Adding...' : `Add Selected (${selectedClubMemberIds.size}) to Queue`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
