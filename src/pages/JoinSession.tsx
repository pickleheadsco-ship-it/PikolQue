import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { SkillLevel, Participant } from '../types';
import { joinSessionAsParticipant } from '../services/sessions/sessionService';
import { BrandLogo } from '../components/ui/BrandLogo';
import {
  ArrowRight,
  UserCheck,
  AlertCircle,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface JoinSessionProps {
  onJoinSuccess: () => void;
  onBackToHome: () => void;
}

export const JoinSession: React.FC<JoinSessionProps> = ({
  onJoinSuccess,
  onBackToHome,
}) => {
  const { session, participants, waitingQueue, setCurrentParticipantId } = useSession();
  const { signInAsAnonymousPlayer } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDifferentPlayerForm, setShowDifferentPlayerForm] = useState(false);

  // Duplicate entry warning for a typed name
  const [duplicateWarning, setDuplicateWarning] = useState<Participant | null>(null);

  // Existing participant found on this device
  const [existingMatch, setExistingMatch] = useState<Participant | null>(null);

  useEffect(() => {
    if (!session) return;
    const savedId =
      localStorage.getItem(`picklequeue_session_${session.id}_participant_id`) ||
      localStorage.getItem('picklequeue_participant_id');

    if (savedId && participants.length > 0) {
      const match = participants.find((p) => p.participantId === savedId && p.status !== 'left');
      if (match) {
        setExistingMatch(match);
      }
    }
  }, [session, participants]);

  // Check if current name and surname match an already checked-in participant
  const matchingExistingPlayer = useMemo(() => {
    const f = firstName.trim().toLowerCase();
    const s = surname.trim().toLowerCase();
    if (!f || !s) return null;
    const combined = `${f} ${s}`;

    return participants.find((p) => {
      if (p.status === 'left') return false;
      const pName = p.name ? p.name.trim().toLowerCase() : '';
      const pFirst = p.firstName ? p.firstName.trim().toLowerCase() : '';
      const pSurname = p.surname ? p.surname.trim().toLowerCase() : '';

      return (
        pName === combined ||
        (pFirst === f && pSurname === s) ||
        (pFirst && !pSurname && pFirst === combined)
      );
    }) || null;
  }, [firstName, surname, participants]);

  const handleReconnect = (participantToUse?: Participant) => {
    const target = participantToUse || existingMatch;
    if (target && session) {
      localStorage.setItem('picklequeue_participant_id', target.participantId);
      localStorage.setItem(`picklequeue_session_${session.id}_participant_id`, target.participantId);
      setCurrentParticipantId(target.participantId);
      onJoinSuccess();
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const cleanFirst = firstName.trim();
    const cleanSurname = surname.trim();

    if (!cleanFirst) {
      setError('Please enter your first name.');
      return;
    }
    if (!cleanSurname) {
      setError('Please enter your surname.');
      return;
    }

    const fullName = `${cleanFirst} ${cleanSurname}`;

    // STRICT DOUBLE ENTRY CHECK: Block duplicate registration if player is already active in queue
    if (matchingExistingPlayer) {
      setDuplicateWarning(matchingExistingPlayer);
      setError(`A player named "${fullName}" is already checked into this session queue!`);
      return;
    }

    setIsJoining(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      // Background auth with safe fallback
      try {
        await Promise.race([
          signInAsAnonymousPlayer(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch {
        // Continue even if background auth handshake takes longer
      }

      const newParticipant = await joinSessionAsParticipant(session.id, {
        name: fullName,
        firstName: cleanFirst,
        surname: cleanSurname,
        skillLevel,
      });

      if (newParticipant?.participantId) {
        localStorage.setItem('picklequeue_participant_id', newParticipant.participantId);
        localStorage.setItem(`picklequeue_session_${session.id}_participant_id`, newParticipant.participantId);
        setCurrentParticipantId(newParticipant.participantId);
      }

      onJoinSuccess();
    } catch (err: any) {
      console.error('Join session error:', err);
      setError(err?.message || 'Failed to join session queue. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="clay-card rounded-3xl p-6 text-center max-w-xs w-full">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">Connecting to court session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between max-w-md mx-auto p-4 sm:p-6">
      {/* Top Header */}
      <header className="py-3 text-center">
        <div className="flex justify-center mb-2.5">
          <BrandLogo size="lg" />
        </div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">PickleQueue</h1>
        <p className="text-xs text-slate-500 font-medium">Live Court Queue System</p>
      </header>

      {/* Main Container */}
      <main className="clay-card rounded-3xl p-6 sm:p-7 my-auto space-y-5 shadow-xl">
        {/* Session Info Header */}
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl uppercase tracking-wider clay-pill">
              QR Check-In
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Code: {session.joinCode}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{session.name}</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {session.venueName} • {session.numberOfCourts} {session.numberOfCourts === 1 ? 'Court' : 'Courts'} Active
          </p>

          <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-slate-600">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 clay-inset">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>{waitingQueue.length} Waiting</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 clay-inset">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>4-In / 4-Out Rotation</span>
            </div>
          </div>
        </div>

        {/* DOUBLE ENTRY PREVENTION: ALREADY CHECKED IN ON THIS DEVICE */}
        {existingMatch && !showDifferentPlayerForm ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-left clay-subcard space-y-3">
              <div className="flex items-center gap-2 text-emerald-950 font-black">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm">You are already checked in!</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Registered Player
                </div>
                <div className="text-base font-black text-slate-900">
                  {existingMatch.name}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    {existingMatch.skillLevel}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {existingMatch.status === 'playing' || existingMatch.status === 'assigned'
                      ? '🎾 Currently Playing on Court'
                      : `Queue Position #${existingMatch.queuePosition || 1}`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-emerald-800 font-medium">
                Double entry avoided: Your player queue spot is active and waiting for your next court rotation.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleReconnect(existingMatch)}
              className="w-full py-4 clay-btn clay-btn-primary rounded-2xl text-sm font-black shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>View My Live Queue & Court Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowDifferentPlayerForm(true)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline transition-colors"
              >
                Not {existingMatch.name}? Check in as a different player
              </button>
            </div>
          </div>
        ) : (
          /* JOIN FORM WITH STRICT FIRST NAME & SURNAME */
          <form onSubmit={handleJoin} className="space-y-4">
            {/* DUPLICATE WARNING CALLOUT */}
            {duplicateWarning && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-black">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Double Entry Prevented</span>
                </div>
                <p className="font-medium text-amber-800">
                  A player with the name <strong>{duplicateWarning.name}</strong> is already in this session's queue (Position #{duplicateWarning.queuePosition || 1}).
                </p>
                <button
                  type="button"
                  onClick={() => handleReconnect(duplicateWarning)}
                  className="w-full py-2.5 clay-btn clay-btn-primary rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Reconnect as {duplicateWarning.name}</span>
                </button>
              </div>
            )}

            {/* SEPARATE NAME & SURNAME INPUT FIELDS */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <div className="clay-inset rounded-2xl px-4 py-3">
                  <input
                    type="text"
                    required
                    maxLength={35}
                    placeholder="e.g. Alex"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (error) setError(null);
                      if (duplicateWarning) setDuplicateWarning(null);
                    }}
                    className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-hidden placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Surname <span className="text-rose-500">*</span>
                </label>
                <div className="clay-inset rounded-2xl px-4 py-3">
                  <input
                    type="text"
                    required
                    maxLength={35}
                    placeholder="e.g. Henderson"
                    value={surname}
                    onChange={(e) => {
                      setSurname(e.target.value);
                      if (error) setError(null);
                      if (duplicateWarning) setDuplicateWarning(null);
                    }}
                    className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-hidden placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
              </div>
            </div>

            {/* SKILL LEVEL SELECTOR */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Skill Level
                </label>
                <span className="text-[11px] font-bold text-slate-400">For balanced matchups</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSkillLevel(lvl)}
                    className={`py-3 text-xs font-black rounded-2xl capitalize transition-all clay-btn ${
                      skillLevel === lvl
                        ? 'clay-btn-primary shadow-md'
                        : 'clay-btn-secondary text-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* ERROR ALERT */}
            {error && !duplicateWarning && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isJoining || !firstName.trim() || !surname.trim()}
                className="w-full py-4 clay-btn clay-btn-primary rounded-2xl text-sm font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              >
                <span>{isJoining ? 'Registering Queue Entry...' : 'Enter Live Queue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {existingMatch && showDifferentPlayerForm && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowDifferentPlayerForm(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  ← Return to my check-in ({existingMatch.name})
                </button>
              </div>
            )}
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-3">
        <button
          onClick={onBackToHome}
          className="text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors"
        >
          Cancel & Return Home
        </button>
      </footer>
    </div>
  );
};
