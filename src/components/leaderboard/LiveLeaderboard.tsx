import React, { useState, useMemo } from 'react';
import { Participant, Court, Match } from '../../types';
import { SkillBadge } from '../ui/Badge';
import {
  Trophy,
  Flame,
  Activity,
  ArrowUpDown,
  Filter,
  Medal,
  Play,
  Clock,
  Coffee,
  Users,
  Search,
} from 'lucide-react';

interface LiveLeaderboardProps {
  participants: Participant[];
  courts?: Court[];
  activeMatches?: Match[];
  highlightParticipantId?: string | null;
  compact?: boolean;
  showTitle?: boolean;
}

export type LeaderboardSortOption = 'winRate' | 'wins' | 'gamesPlayed' | 'pointDiff' | 'streak';

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  participants,
  courts = [],
  activeMatches = [],
  highlightParticipantId,
  compact = false,
  showTitle = true,
}) => {
  const [sortBy, setSortBy] = useState<LeaderboardSortOption>('winRate');
  const [filterStatus, setFilterStatus] = useState<'all' | 'playing' | 'waiting'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active court lookup for live in-game status
  const courtByParticipantId = useMemo(() => {
    const map = new Map<string, string>();
    for (const match of activeMatches) {
      if (match.status === 'playing') {
        const court = courts.find((c) => c.courtId === match.courtId);
        const courtName = court ? court.name : 'Court';
        for (const pId of match.playerIds || []) {
          map.set(pId, courtName);
        }
      }
    }
    return map;
  }, [activeMatches, courts]);

  // Compute sorted & filtered standings
  const sortedPlayers = useMemo(() => {
    let list = participants.filter((p) => p.status !== 'left');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (filterStatus === 'playing') {
      list = list.filter((p) => p.status === 'playing' || courtByParticipantId.has(p.participantId));
    } else if (filterStatus === 'waiting') {
      list = list.filter((p) => p.status === 'waiting');
    }

    return list.sort((a, b) => {
      if (sortBy === 'winRate') {
        // High win rate first, tie-break by total wins, then games played
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.gamesPlayed - a.gamesPlayed;
      }
      if (sortBy === 'wins') {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winRate - a.winRate;
      }
      if (sortBy === 'gamesPlayed') {
        if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
        return b.wins - a.wins;
      }
      if (sortBy === 'pointDiff') {
        const diffA = a.pointDifferential || 0;
        const diffB = b.pointDifferential || 0;
        if (diffB !== diffA) return diffB - diffA;
        return b.wins - a.wins;
      }
      if (sortBy === 'streak') {
        const streakA = a.streak || 0;
        const streakB = b.streak || 0;
        if (streakB !== streakA) return streakB - streakA;
        return b.wins - a.wins;
      }
      return 0;
    });
  }, [participants, sortBy, filterStatus, searchQuery, courtByParticipantId]);

  // Summary leaders
  const topScorer = useMemo(() => {
    return [...participants].sort((a, b) => (b.pointsScored || 0) - (a.pointsScored || 0))[0];
  }, [participants]);

  const topStreak = useMemo(() => {
    return [...participants].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];
  }, [participants]);

  return (
    <div className="clay-card rounded-3xl overflow-hidden shadow-xl transition-all">
      {/* Header bar */}
      {showTitle && (
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center clay-subcard">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base tracking-tight">Live Leaderboard</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Real-time standings, win rates & player rotation</p>
            </div>
          </div>

          {/* Quick Stats Pills */}
          {!compact && (
            <div className="flex items-center gap-2 text-xs font-bold">
              {topStreak && (topStreak.streak || 0) >= 2 && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-800 border border-orange-200">
                  <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
                  <span>Streak Leader: {topStreak.name} ({topStreak.streak}W)</span>
                </div>
              )}
              {topScorer && (topScorer.pointsScored || 0) > 0 && (
                <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Points: {topScorer.name} ({topScorer.pointsScored} pts)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter and sorting toolbar */}
      <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Status filters */}
        <div className="flex items-center gap-1 clay-inset rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({participants.filter((p) => p.status !== 'left').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('playing')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filterStatus === 'playing'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>On Court</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('waiting')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterStatus === 'waiting'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Queue
          </button>
        </div>

        {/* Sort selector & search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="clay-inset rounded-xl pl-7 pr-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 font-medium focus:outline-hidden w-28 sm:w-36"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as LeaderboardSortOption)}
              className="clay-inset rounded-xl px-2.5 py-1 text-slate-800 font-bold focus:outline-hidden text-xs"
            >
              <option value="winRate">Win Rate (%)</option>
              <option value="wins">Total Wins</option>
              <option value="gamesPlayed">Games Played</option>
              <option value="pointDiff">Point Differential</option>
              <option value="streak">Win Streak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players List */}
      {sortedPlayers.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">
          {searchQuery ? 'No players match your search filter.' : 'No active player matches recorded yet.'}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW (< 768px): Card based */}
          <div className="block md:hidden p-3.5 space-y-2.5">
            {sortedPlayers.map((player, idx) => {
              const isHighlighted = highlightParticipantId === player.participantId;
              const courtPlaying = courtByParticipantId.get(player.participantId);
              const rank = idx + 1;

              return (
                <div
                  key={player.participantId}
                  className={`p-3.5 rounded-2xl transition-all border flex flex-col gap-2 ${
                    isHighlighted
                      ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400 shadow-md'
                      : 'clay-subcard border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 text-center font-black font-mono text-sm">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 text-sm">{player.name}</span>
                          {isHighlighted && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900">
                              YOU
                            </span>
                          )}
                        </div>
                        {courtPlaying ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Playing on {courtPlaying}</span>
                          </span>
                        ) : player.status === 'resting' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Coffee className="w-3 h-3" />
                            <span>Resting</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>Queue #{player.queuePosition || 1}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black font-mono text-emerald-700 text-base leading-none">
                        {player.winRate}%
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Win Rate</span>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs text-slate-600 font-medium">
                    <SkillBadge skill={player.skillLevel} />
                    <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
                      <span>{player.gamesPlayed} GP</span>
                      <span className="text-emerald-700">{player.wins}W</span>
                      <span className="text-rose-600">{player.losses}L</span>
                      {(player.pointDifferential !== undefined && player.pointDifferential !== 0) && (
                        <span className={player.pointDifferential > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                          {player.pointDifferential > 0 ? `+${player.pointDifferential}` : player.pointDifferential} diff
                        </span>
                      )}
                      {(player.streak || 0) >= 2 && (
                        <span className="flex items-center text-orange-600 font-black">
                          <Flame className="w-3 h-3 fill-orange-500" />
                          <span>{player.streak}W</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (>= 768px): Structured Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-100/60 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 text-center w-14">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-3">Live Status</th>
                  <th className="py-3 px-3">Skill</th>
                  <th className="py-3 px-3 text-center">GP</th>
                  <th className="py-3 px-3 text-center">W - L</th>
                  <th className="py-3 px-4 text-center">Win Rate</th>
                  <th className="py-3 px-3 text-center">Pts Diff</th>
                  <th className="py-3 px-4 text-center">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPlayers.map((player, idx) => {
                  const isHighlighted = highlightParticipantId === player.participantId;
                  const courtPlaying = courtByParticipantId.get(player.participantId);
                  const rank = idx + 1;

                  return (
                    <tr
                      key={player.participantId}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-50/80 font-bold'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50/70'
                          : 'bg-slate-50/30 hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center font-mono font-black text-sm">
                        {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-black text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {isHighlighted && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Live In-Game Status */}
                      <td className="py-3 px-3">
                        {courtPlaying ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-black text-[11px] shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Playing on {courtPlaying}</span>
                          </span>
                        ) : player.status === 'resting' ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-bold">
                            <Coffee className="w-3.5 h-3.5" />
                            <span>Resting</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-bold">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Queue #{player.queuePosition || 1}</span>
                          </span>
                        )}
                      </td>

                      {/* Skill */}
                      <td className="py-3 px-3">
                        <SkillBadge skill={player.skillLevel} />
                      </td>

                      {/* GP */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {player.gamesPlayed}
                      </td>

                      {/* W - L */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className="text-emerald-700 font-black">{player.wins}W</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-rose-600">{player.losses}L</span>
                      </td>

                      {/* Win Rate */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden clay-inset">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, player.winRate))}%` }}
                            />
                          </div>
                          <span className="font-mono font-black text-emerald-800 text-xs w-9 text-right">
                            {player.winRate}%
                          </span>
                        </div>
                      </td>

                      {/* Point Diff */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span
                          className={
                            (player.pointDifferential || 0) > 0
                              ? 'text-emerald-700 font-black'
                              : (player.pointDifferential || 0) < 0
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }
                        >
                          {(player.pointDifferential || 0) > 0
                            ? `+${player.pointDifferential}`
                            : player.pointDifferential || 0}
                        </span>
                      </td>

                      {/* Win Streak */}
                      <td className="py-3 px-4 text-center font-mono">
                        {(player.streak || 0) >= 2 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 font-black text-xs">
                            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-600" />
                            <span>{player.streak}W</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
