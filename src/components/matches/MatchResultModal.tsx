import React, { useState } from 'react';
import { Court, Match, Participant } from '../../types';
import { Trophy, X, Award, AlertCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MatchResultModalProps {
  court: Court;
  match: Match;
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (winningTeam: 'teamA' | 'teamB', score?: { teamA: number; teamB: number }) => Promise<void>;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  court,
  match,
  participants,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [winningTeam, setWinningTeam] = useState<'teamA' | 'teamB'>('teamA');
  const [scoreA, setScoreA] = useState<string>('11');
  const [scoreB, setScoreB] = useState<string>('9');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const getPlayer = (id: string) => participants.find((p) => p.participantId === id);
  const teamAPlayers = match.teamA.map(getPlayer).filter(Boolean) as Participant[];
  const teamBPlayers = match.teamB.map(getPlayer).filter(Boolean) as Participant[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const parsedA = parseInt(scoreA, 10);
      const parsedB = parseInt(scoreB, 10);
      const score = !isNaN(parsedA) && !isNaN(parsedB) ? { teamA: parsedA, teamB: parsedB } : undefined;

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}

      await onSubmit(winningTeam, score);
      onClose();
    } catch (err: any) {
      console.error('Error finalizing match:', err);
      setErrorMsg(err?.message || 'Could not complete match. Please try again.');
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
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Record Match Result</h3>
              <p className="text-xs text-slate-500 font-medium">{court.name} — Doubles Match</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
            Select Winning Team
          </label>

          {/* Team Selection Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Team A Option */}
            <button
              type="button"
              onClick={() => {
                setWinningTeam('teamA');
                setScoreA('11');
                setScoreB('7');
              }}
              className={`p-3.5 rounded-2xl text-left transition-all relative flex flex-col justify-between clay-btn ${
                winningTeam === 'teamA'
                  ? 'clay-btn-primary shadow-lg ring-2 ring-emerald-300'
                  : 'clay-subcard text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider">Team A</span>
                  {winningTeam === 'teamA' && <Award className="w-4 h-4 text-amber-300" />}
                </div>
                <div className="space-y-0.5 text-xs font-bold">
                  {teamAPlayers.map((p) => (
                    <div key={p.participantId} className="truncate">
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 text-[11px] font-black uppercase tracking-wider">Winner</div>
            </button>

            {/* Team B Option */}
            <button
              type="button"
              onClick={() => {
                setWinningTeam('teamB');
                setScoreA('7');
                setScoreB('11');
              }}
              className={`p-3.5 rounded-2xl text-left transition-all relative flex flex-col justify-between clay-btn ${
                winningTeam === 'teamB'
                  ? 'clay-btn-sky shadow-lg ring-2 ring-sky-300'
                  : 'clay-subcard text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider">Team B</span>
                  {winningTeam === 'teamB' && <Award className="w-4 h-4 text-amber-300" />}
                </div>
                <div className="space-y-0.5 text-xs font-bold">
                  {teamBPlayers.map((p) => (
                    <div key={p.participantId} className="truncate">
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 text-[11px] font-black uppercase tracking-wider">Winner</div>
            </button>
          </div>

          {/* Final Score Inputs */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
              Final Game Score (Optional)
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Team A</span>
                <div className="clay-inset rounded-2xl px-3 py-1.5">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    className="w-full bg-transparent text-center font-mono font-black text-lg text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
              <span className="text-slate-400 font-black text-lg pt-4">-</span>
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Team B</span>
                <div className="clay-inset rounded-2xl px-3 py-1.5">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    className="w-full bg-transparent text-center font-mono font-black text-lg text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 clay-subcard rounded-2xl text-xs text-slate-600 font-medium border border-slate-200/60">
            <strong className="text-slate-900 font-bold">4 In / 4 Out Rotation:</strong> All 4 players will cycle off the court and re-enter behind waiting players.
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-bold">{errorMsg}</div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-3 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-black shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finalizing...</span>
                </>
              ) : (
                <span>Finalize & Return to Queue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
