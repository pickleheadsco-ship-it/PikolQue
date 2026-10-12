import React, { useState } from 'react';
import { SkillLevel } from '../../types';
import { UserPlus, Upload, X } from 'lucide-react';
import { joinSessionAsParticipant, bulkImportParticipants } from '../../services/sessions/sessionService';

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
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [bulkText, setBulkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await bulkImportParticipants(sessionId, names, skillLevel);
      setBulkText('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to bulk import players.');
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
          <button onClick={onClose} className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mt-4 flex rounded-2xl clay-inset p-1">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all clay-btn ${
              mode === 'single' ? 'clay-btn-secondary text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Single Player
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all clay-btn ${
              mode === 'bulk' ? 'clay-btn-secondary text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Paste Roster (Bulk)
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold">
            {error}
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
        ) : (
          <form onSubmit={handleSubmitBulk} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Paste Player Names (One per line)
              </label>
              <div className="clay-inset rounded-2xl p-2.5">
                <textarea
                  rows={5}
                  required
                  placeholder="Alex&#10;Ben&#10;Carla&#10;David&#10;Emma"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
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
                disabled={isSubmitting || !bulkText.trim()}
                className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-40"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Importing...' : 'Bulk Check In'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
