import React from 'react';
import { Court, Match, Participant } from '../../types';
import { SkillBadge } from '../ui/Badge';
import { MatchTimer } from '../ui/WaitTimeTracker';
import { Volume2, Trophy, AlertTriangle, Play, Sparkles } from 'lucide-react';

interface CourtCardProps {
  court: Court;
  currentMatch?: Match | null;
  participants: Participant[];
  onEndMatch: (court: Court, match: Match) => void;
  onAnnounceCourt: (court: Court, match?: Match) => void;
  onAssignNextGroup: (court: Court) => void;
  onSetMaintenance: (court: Court, maintenance: boolean) => void;
  onResetCourt?: (court: Court) => void;
}

export const CourtCard: React.FC<CourtCardProps> = ({
  court,
  currentMatch,
  participants,
  onEndMatch,
  onAnnounceCourt,
  onAssignNextGroup,
  onSetMaintenance,
  onResetCourt,
}) => {
  const isPlaying = court.status === 'playing';
  const hasMatchData = isPlaying && Boolean(currentMatch);
  const isMaintenance = court.status === 'maintenance';

  const getPlayer = (id: string): Participant | undefined => {
    return participants.find((p) => p.participantId === id);
  };

  const teamAPlayers = currentMatch?.teamA?.map(getPlayer).filter(Boolean) as Participant[] || [];
  const teamBPlayers = currentMatch?.teamB?.map(getPlayer).filter(Boolean) as Participant[] || [];

  // Fallback match object if court is in playing state but match doc is being retrieved
  const effectiveMatch: Match = currentMatch || {
    matchId: court.currentMatchId || `match-${court.courtId}`,
    sessionId: '',
    courtId: court.courtId,
    courtName: court.name,
    playerIds: [],
    teamA: [],
    teamB: [],
    status: 'playing',
    matchingMode: 'balanced',
    startedAt: court.updatedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return (
    <div
      className={`rounded-3xl transition-all duration-200 flex flex-col justify-between overflow-hidden ${
        isPlaying
          ? 'clay-card ring-2 ring-emerald-400/40'
          : isMaintenance
          ? 'clay-subcard opacity-85'
          : 'clay-card'
      }`}
    >
      {/* Court Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full shadow-xs ${
              isPlaying
                ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse'
                : isMaintenance
                ? 'bg-slate-400'
                : 'bg-sky-400 ring-4 ring-sky-50'
            }`}
          />
          <div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
              {court.name}
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {isPlaying ? 'Match in progress' : isMaintenance ? 'Reserved / Paused' : 'Court Open'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPlaying && (
            <div className="clay-inset px-2.5 py-1 rounded-xl">
              <MatchTimer startedAt={effectiveMatch.startedAt} className="bg-transparent border-0 p-0 text-xs text-emerald-800" />
            </div>
          )}

          {isPlaying && currentMatch && (
            <button
              onClick={() => onAnnounceCourt(court, currentMatch)}
              className="w-9 h-9 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-700"
              title="Announce Court on Speaker"
              aria-label="Announce court"
            >
              <Volume2 className="w-4 h-4 text-sky-600" />
            </button>
          )}

          <button
            onClick={() => onSetMaintenance(court, !isMaintenance)}
            className="px-3 py-1.5 rounded-xl clay-btn clay-btn-secondary text-xs font-bold text-slate-600"
            title={isMaintenance ? 'Open Court' : 'Pause Court'}
          >
            {isMaintenance ? 'Open' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
        {isPlaying ? (
          hasMatchData && (teamAPlayers.length > 0 || teamBPlayers.length > 0) ? (
            <div className="space-y-3">
              {/* Team A */}
              <div className="clay-subcard rounded-2xl p-3 sm:p-3.5 border border-emerald-100">
                <div className="flex items-center justify-between text-xs font-black text-emerald-800 mb-2">
                  <span>TEAM A</span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-lg">Serve</span>
                </div>
                <div className="space-y-2">
                  {teamAPlayers.map((p) => (
                    <div key={p.participantId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-5 h-5 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[9px] shrink-0">
                            {(p.name?.trim() || p.firstName?.trim() || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[150px]">{p.name || 'Player'}</span>
                        <SkillBadge skill={p.skillLevel} />
                      </div>
                      <span className="text-slate-500 text-[11px] font-mono font-semibold">
                        {p.gamesPlayed}G • {p.wins}W
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-slate-200/80 w-full" />
                <span className="clay-pill bg-white px-2.5 py-0.5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest absolute">
                  VS
                </span>
              </div>

              {/* Team B */}
              <div className="clay-subcard rounded-2xl p-3 sm:p-3.5 border border-sky-100">
                <div className="flex items-center justify-between text-xs font-black text-sky-800 mb-2">
                  <span>TEAM B</span>
                  <span className="text-[11px] font-semibold text-sky-600 bg-sky-100/60 px-2 py-0.5 rounded-lg">Side 2</span>
                </div>
                <div className="space-y-2">
                  {teamBPlayers.map((p) => (
                    <div key={p.participantId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-5 h-5 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-black text-[9px] shrink-0">
                            {(p.name?.trim() || p.firstName?.trim() || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[150px]">{p.name || 'Player'}</span>
                        <SkillBadge skill={p.skillLevel} />
                      </div>
                      <span className="text-slate-500 text-[11px] font-mono font-semibold">
                        {p.gamesPlayed}G • {p.wins}W
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center p-4 clay-subcard rounded-2xl border border-emerald-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-black text-slate-900">Match Currently Playing</p>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">
                Ongoing doubles game on {court.name}. Ready to record result when players finish.
              </p>
              {onResetCourt && (
                <button
                  type="button"
                  onClick={() => onResetCourt(court)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Clear / Reset Court to Open
                </button>
              )}
            </div>
          )
        ) : isMaintenance ? (
          <div className="py-8 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-2xl clay-subcard flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-extrabold text-slate-800">Court Paused</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
              Court is reserved or in maintenance. Click 'Open' above to resume rotation.
            </p>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center p-4 clay-subcard rounded-2xl border-2 border-dashed border-emerald-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-base font-black text-slate-900">Court is Available</p>
            <p className="text-xs text-slate-500 mt-0.5 mb-4 font-medium">Ready to seat the next 4 players</p>
            <button
              onClick={() => onAssignNextGroup(court)}
              className="clay-btn clay-btn-primary px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-md"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Seat From Queue</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-4 sm:p-5 pt-0 flex items-center justify-between gap-2">
        {isPlaying ? (
          <div className="w-full flex items-center gap-2">
            <button
              onClick={() => onEndMatch(court, effectiveMatch)}
              className="flex-1 py-3.5 clay-btn clay-btn-primary rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer font-black"
            >
              <Trophy className="w-4 h-4" />
              <span>End Match & Record Score</span>
            </button>
            {onResetCourt && (
              <button
                onClick={() => onResetCourt(court)}
                className="py-3.5 px-3 clay-btn clay-btn-secondary text-slate-600 rounded-2xl text-xs font-bold"
                title="Reset court immediately"
              >
                Reset
              </button>
            )}
          </div>
        ) : (
          <div className="w-full flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
            <span>Rotation: 4 In / 4 Out</span>
            <span className="font-bold text-emerald-600">Open</span>
          </div>
        )}
      </div>
    </div>
  );
};
