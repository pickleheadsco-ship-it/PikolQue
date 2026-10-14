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

import { useSession } from '../../context/SessionContext';

interface LiveLeaderboardProps {
  participants?: Participant[];
  courts?: Court[];
  activeMatches?: Match[];
  highlightParticipantId?: string | null;
  compact?: boolean;
  showTitle?: boolean;
}

export type LeaderboardSortOption = 'winRate' | 'wins' | 'gamesPlayed' | 'pointDiff' | 'streak';

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  participants: propParticipants,
  courts: propCourts,
  activeMatches: propActiveMatches,
  highlightParticipantId,
  compact = false,
  showTitle = true,
}) => {
  const sessionContext = useSession();
  const participants = propParticipants || sessionContext.participants || [];
  const courts = propCourts || sessionContext.courts || [];
  const activeMatches = propActiveMatches || sessionContext.activeMatches || [];
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
    let list = (participants || []).filter((p) => p && p.status !== 'left');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p && typeof p.name === 'string' && p.name.toLowerCase().includes(q));
    }

    if (filterStatus === 'playing') {
      list = list.filter((p) => p && (p.status === 'playing' || courtByParticipantId.has(p.participantId)));
    } else if (filterStatus === 'waiting') {
      list = list.filter((p) => p && p.status === 'waiting');
    }

    return list.sort((a, b) => {
      const winRateA = a?.winRate || 0;
      const winRateB = b?.winRate || 0;
      const winsA = a?.wins || 0;
      const winsB = b?.wins || 0;
      const gpA = a?.gamesPlayed || 0;
      const gpB = b?.gamesPlayed || 0;

      if (sortBy === 'winRate') {
        if (winRateB !== winRateA) return winRateB - winRateA;
        if (winsB !== winsA) return winsB - winsA;
        return gpB - gpA;
      }
      if (sortBy === 'wins') {
        if (winsB !== winsA) return winsB - winsA;
        return winRateB - winRateA;
      }
      if (sortBy === 'gamesPlayed') {
        if (gpB !== gpA) return gpB - gpA;
        return winsB - winsA;
      }
      if (sortBy === 'pointDiff') {
        const diffA = a?.pointDifferential || 0;
        const diffB = b?.pointDifferential || 0;
        if (diffB !== diffA) return diffB - diffA;
        return winsB - winsA;
      }
      if (sortBy === 'streak') {
        const streakA = a?.streak || 0;
        const streakB = b?.streak || 0;
        if (streakB !== streakA) return streakB - streakA;
        return winsB - winsA;
      }
      return 0;
    });
  }, [participants, sortBy, filterStatus, searchQuery, courtByParticipantId]);

  // Summary leaders
  const topScorer = useMemo(() => {
    return [...(participants || [])].sort((a, b) => (b?.pointsScored || 0) - (a?.pointsScored || 0))[0] || null;
  }, [participants]);

  const topStreak = useMemo(() => {
    return [...(participants || [])].sort((a, b) => (b?.streak || 0) - (a?.streak || 0))[0] || null;
  }, [participants]);

  return (
    <div className="clay-card rounded-3xl overflow-hidden shadow-xl transition-all relative bg-gradient-to-b from-white via-emerald-950/[0.02] to-slate-50">
      {/* Authentic Pickleball Court Theme Background Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.14] overflow-hidden" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 1000 600" fill="none" preserveAspectRatio="none">
          <defs>
            {/* Court Surface Gradients */}
            <linearGradient id="courtGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#047857" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="kitchenClay" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#115e59" stopOpacity="0.45" />
            </linearGradient>
            <pattern id="netMesh" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 10 0 M 0 0 L 10 10" stroke="#064e3b" strokeWidth="0.8" opacity="0.6" />
            </pattern>
          </defs>

          {/* Out-of-bounds Perimeter Apron */}
          <rect x="0" y="0" width="1000" height="600" fill="#022c22" fillOpacity="0.08" />

          {/* In-bounds Court Surface */}
          <rect x="50" y="40" width="900" height="520" rx="8" fill="url(#courtGreen)" stroke="#059669" strokeWidth="6" />

          {/* Non-Volley Zone (The Kitchen) - 7ft each side of the net */}
          <rect x="360" y="40" width="280" height="520" fill="url(#kitchenClay)" />

          {/* Non-Volley Zone Boundary Lines */}
          <line x1="360" y1="40" x2="360" y2="560" stroke="#10b981" strokeWidth="5" />
          <line x1="640" y1="40" x2="640" y2="560" stroke="#10b981" strokeWidth="5" />

          {/* Center Service Dividing Lines (Baseline to Kitchen Line) */}
          <line x1="50" y1="300" x2="360" y2="300" stroke="#10b981" strokeWidth="5" />
          <line x1="640" y1="300" x2="950" y2="300" stroke="#10b981" strokeWidth="5" />

          {/* The Net - Center (x = 500) */}
          <rect x="495" y="30" width="10" height="540" fill="url(#netMesh)" />
          <line x1="500" y1="20" x2="500" y2="580" stroke="#064e3b" strokeWidth="6" strokeDasharray="8 4" />
          {/* Net Posts */}
          <circle cx="500" cy="25" r="7" fill="#047857" />
          <circle cx="500" cy="575" r="7" fill="#047857" />

          {/* Court Labels Watermark */}
          <text x="500" y="295" textAnchor="middle" fill="#065f46" fontSize="14" fontWeight="900" letterSpacing="4" opacity="0.7">
            NVZ • THE KITCHEN
          </text>
          <text x="205" y="170" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="800" letterSpacing="2" opacity="0.5">
            LEFT SERVICE COURT
          </text>
          <text x="205" y="430" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="800" letterSpacing="2" opacity="0.5">
            RIGHT SERVICE COURT
          </text>
          <text x="795" y="170" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="800" letterSpacing="2" opacity="0.5">
            RIGHT SERVICE COURT
          </text>
          <text x="795" y="430" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="800" letterSpacing="2" opacity="0.5">
            LEFT SERVICE COURT
          </text>

          {/* Perforated Pickleball Watermark */}
          <g transform="translate(190, 275)" opacity="0.35">
            <circle cx="0" cy="0" r="32" stroke="#10b981" strokeWidth="2.5" fill="none" />
            <circle cx="-12" cy="-10" r="3.5" fill="#10b981" />
            <circle cx="12" cy="-10" r="3.5" fill="#10b981" />
            <circle cx="0" cy="-14" r="3.5" fill="#10b981" />
            <circle cx="-16" cy="6" r="3.5" fill="#10b981" />
            <circle cx="16" cy="6" r="3.5" fill="#10b981" />
            <circle cx="-6" cy="16" r="3.5" fill="#10b981" />
            <circle cx="6" cy="16" r="3.5" fill="#10b981" />
            <circle cx="0" cy="0" r="4" fill="#10b981" />
          </g>

          <g transform="translate(810, 275)" opacity="0.35">
            <circle cx="0" cy="0" r="32" stroke="#10b981" strokeWidth="2.5" fill="none" />
            <circle cx="-12" cy="-10" r="3.5" fill="#10b981" />
            <circle cx="12" cy="-10" r="3.5" fill="#10b981" />
            <circle cx="0" cy="-14" r="3.5" fill="#10b981" />
            <circle cx="-16" cy="6" r="3.5" fill="#10b981" />
            <circle cx="16" cy="6" r="3.5" fill="#10b981" />
            <circle cx="-6" cy="16" r="3.5" fill="#10b981" />
            <circle cx="6" cy="16" r="3.5" fill="#10b981" />
            <circle cx="0" cy="0" r="4" fill="#10b981" />
          </g>
        </svg>
      </div>

      {/* Header bar */}
      {showTitle && (
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white/80 backdrop-blur-xs relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center clay-subcard shadow-xs">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                  Pickleheads Open Play Standings
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse clay-pill">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Real-time court standings, win rates & fair rotation ranking</p>
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
          <div className="block md:hidden p-3.5 space-y-2.5 relative z-10">
            {sortedPlayers.map((player, idx) => {
              const isHighlighted = highlightParticipantId === player.participantId;
              const courtPlaying = courtByParticipantId.get(player.participantId);
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;

              let cardBg = 'clay-subcard border-slate-200/60';
              if (isHighlighted) {
                cardBg = 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400 shadow-md';
              } else if (isTop1) {
                cardBg = 'bg-gradient-to-br from-amber-50 via-yellow-50/80 to-emerald-50/30 border-2 border-amber-400 ring-2 ring-amber-300/60 shadow-md';
              } else if (isTop2) {
                cardBg = 'bg-gradient-to-br from-slate-100/90 via-slate-50 to-white border-2 border-slate-300 shadow-xs ring-1 ring-slate-300/50';
              } else if (isTop3) {
                cardBg = 'bg-gradient-to-br from-amber-50/40 via-orange-50/20 to-white border-2 border-amber-600/40 shadow-xs ring-1 ring-amber-600/30';
              }

              return (
                <div
                  key={player.participantId}
                  className={`p-3.5 rounded-2xl transition-all border flex flex-col gap-2 relative overflow-hidden ${cardBg}`}
                >
                  {/* Visual Top Seed Badge for Rank 1 */}
                  {isTop1 && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-yellow-400 text-slate-950 font-black text-[9px] px-3 py-0.5 rounded-bl-xl uppercase tracking-wider shadow-xs flex items-center gap-1">
                      <span>👑</span>
                      <span>Top Seed</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isTop1 ? (
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs ring-1 ring-amber-300">
                          🥇
                        </span>
                      ) : isTop2 ? (
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 font-black text-xs flex items-center justify-center shadow-xs ring-1 ring-slate-300">
                          🥈
                        </span>
                      ) : isTop3 ? (
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 text-amber-100 font-black text-xs flex items-center justify-center shadow-xs ring-1 ring-amber-600">
                          🥉
                        </span>
                      ) : (
                        <span className="w-7 text-center font-black font-mono text-sm text-slate-600">
                          #{rank}
                        </span>
                      )}

                      {player.avatarUrl ? (
                        <img
                          src={player.avatarUrl}
                          alt={player.name}
                          className="w-9 h-9 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                          {(player.name?.trim() || player.firstName?.trim() || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 text-sm">{player.name || 'Player'}</span>
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
          <div className="hidden md:block overflow-x-auto relative z-10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-100/70 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 text-center w-16">Rank</th>
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
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  let rowStyle = idx % 2 === 0 ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/30 hover:bg-slate-50/70';
                  if (isHighlighted) {
                    rowStyle = 'bg-amber-50/80 font-bold';
                  } else if (isTop1) {
                    rowStyle = 'bg-gradient-to-r from-amber-100/70 via-yellow-50/40 to-transparent border-l-4 border-l-amber-500 font-bold hover:bg-amber-100/90';
                  } else if (isTop2) {
                    rowStyle = 'bg-gradient-to-r from-slate-100/80 via-slate-50/40 to-transparent border-l-4 border-l-slate-400 font-bold hover:bg-slate-100/90';
                  } else if (isTop3) {
                    rowStyle = 'bg-gradient-to-r from-amber-50/40 via-orange-50/20 to-transparent border-l-4 border-l-amber-700/60 font-bold hover:bg-amber-50/70';
                  }

                  return (
                    <tr
                      key={player.participantId}
                      className={`transition-colors ${rowStyle}`}
                    >
                      {/* Rank with Top 3 Visual Highlights */}
                      <td className="py-3 px-4 text-center">
                        {isTop1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-300 text-xs">
                            🥇 1st
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 font-black shadow-xs ring-1 ring-slate-300 text-xs">
                            🥈 2nd
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 text-amber-100 font-black shadow-xs ring-1 ring-amber-600 text-xs">
                            🥉 3rd
                          </span>
                        ) : (
                          <span className="font-mono font-black text-slate-700 text-sm">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-black text-slate-900">
                        <div className="flex items-center gap-2">
                          {player.avatarUrl ? (
                            <img
                              src={player.avatarUrl}
                              alt={player.name || 'Player'}
                              className="w-7 h-7 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black text-[10px] shrink-0">
                              {(player.name?.trim() || player.firstName?.trim() || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{player.name || 'Player'}</span>
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
