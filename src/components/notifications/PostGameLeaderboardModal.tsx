import React, { useEffect } from 'react';
import { Participant, Court, Match } from '../../types';
import { SkillBadge } from '../ui/Badge';
import { Trophy, Award, Flame, X, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import { firePickleballBurst } from '../../services/fx/pickleballBurst';

interface PostGameLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant;
  participants: Participant[];
  courts?: Court[];
  activeMatches?: Match[];
  onViewFullLeaderboard?: () => void;
}

export const PostGameLeaderboardModal: React.FC<PostGameLeaderboardModalProps> = ({
  isOpen,
  onClose,
  participant,
  participants,
  courts = [],
  activeMatches = [],
  onViewFullLeaderboard,
}) => {
  const isWin = participant.lastMatchResult === 'win';

  useEffect(() => {
    if (isOpen && isWin) {
      try {
        firePickleballBurst(window.innerWidth / 2, window.innerHeight * 0.35);
      } catch {}
    }
  }, [isOpen, isWin]);

  if (!isOpen) return null;

  // Calculate player's live rank on the leaderboard
  const eligible = [...participants].filter((p) => p && p.status !== 'left');
  eligible.sort((a, b) => {
    if ((b.winRate || 0) !== (a.winRate || 0)) return (b.winRate || 0) - (a.winRate || 0);
    if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
    return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
  });

  const playerRankIndex = eligible.findIndex((p) => p.participantId === participant.participantId);
  const playerRank = playerRankIndex !== -1 ? playerRankIndex + 1 : 1;

  // Top 5 snapshot for quick after-game standings preview
  const topStandings = eligible.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="clay-card rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-emerald-400 animate-in zoom-in-95 duration-150">
        {/* Banner Top */}
        <div
          className={`p-6 text-white text-center relative ${
            isWin
              ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800'
              : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-black uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Game Concluded • Leaderboard Updated</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-1">
            {isWin ? 'VICTORY! 🏆' : 'GAME COMPLETE! 🎾'}
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-white/90 max-w-xs mx-auto">
            {isWin
              ? 'Outstanding performance on court! Your live ranking has climbed.'
              : 'Great effort on court! All 4 players return to queue with priority wait times.'}
          </p>

          {/* Quick Rank Badge */}
          <div className="mt-4 inline-flex items-center gap-2 bg-white text-slate-900 font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-lg">
            <span>Standings Rank:</span>
            <span className="text-emerald-700 font-mono text-base font-black">
              {playerRank === 1 ? '🥇 1st' : playerRank === 2 ? '🥈 2nd' : playerRank === 3 ? '🥉 3rd' : `#${playerRank}`}
            </span>
            <span className="text-slate-400 font-medium text-xs">of {eligible.length}</span>
          </div>
        </div>

        {/* Content Body with Court Themed Background */}
        <div className="p-5 sm:p-6 space-y-4 bg-white relative overflow-hidden">
          {/* Subtle Pickleball Court Schema Layer */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.08] overflow-hidden" aria-hidden="true">
            <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" preserveAspectRatio="none">
              <rect x="10" y="10" width="380" height="280" rx="6" stroke="#059669" strokeWidth="4" />
              <line x1="140" y1="10" x2="140" y2="290" stroke="#059669" strokeWidth="3" />
              <line x1="260" y1="10" x2="260" y2="290" stroke="#059669" strokeWidth="3" />
              <line x1="200" y1="10" x2="200" y2="290" stroke="#047857" strokeWidth="5" strokeDasharray="4 4" />
              <line x1="10" y1="150" x2="140" y2="150" stroke="#059669" strokeWidth="3" />
              <line x1="260" y1="150" x2="390" y2="150" stroke="#059669" strokeWidth="3" />
            </svg>
          </div>

          {/* Post-Game Stat Gains Card */}
          <div className="grid grid-cols-3 gap-2 text-center relative z-10">
            <div className="clay-subcard rounded-2xl p-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Win Rate</span>
              <span className="text-base font-mono font-black text-emerald-700">
                {participant.gamesPlayed > 0 ? `${participant.winRate}%` : '—'}
              </span>
            </div>

            <div className="clay-subcard rounded-2xl p-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Record</span>
              <span className="text-base font-mono font-black text-slate-900">
                {participant.wins}W - {participant.losses}L
              </span>
            </div>

            <div className="clay-subcard rounded-2xl p-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Streak</span>
              <span className="text-base font-mono font-black text-amber-600 flex items-center justify-center gap-1">
                {(participant.streak || 0) > 0 && <Flame className="w-3.5 h-3.5 fill-current" />}
                {participant.streak || 0}W
              </span>
            </div>
          </div>

          {/* After Game Live Leaderboard Snapshot */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Pickleheads Open Play Standings (Live)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-bold">Top 5</span>
            </div>

            <div className="clay-inset rounded-2xl p-2 divide-y divide-slate-200/60 text-xs">
              {topStandings.map((p, idx) => {
                const isYou = p.participantId === participant.participantId;
                const rank = idx + 1;
                return (
                  <div
                    key={p.participantId}
                    className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-all ${
                      isYou ? 'bg-amber-100/80 font-black text-slate-900 ring-1 ring-amber-300' : 'text-slate-700 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-black text-slate-500 text-[11px] w-5">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </span>
                      <span className="truncate max-w-[120px]">{p.name}</span>
                      {isYou && (
                        <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-md">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 font-mono text-[11px]">
                      <span className="text-slate-500">{p.wins}W</span>
                      <span className="font-black text-emerald-700">{p.winRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={onClose}
              className="w-full py-3.5 clay-btn clay-btn-primary rounded-2xl text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 fill-current" />
              <span>Continue in Live Queue (Position #{participant.queuePosition || 1})</span>
            </button>

            {onViewFullLeaderboard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewFullLeaderboard();
                }}
                className="w-full py-2.5 clay-btn clay-btn-secondary text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Full Live Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
