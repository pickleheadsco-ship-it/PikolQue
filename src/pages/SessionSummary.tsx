import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Participant, Match } from '../types';
import { SkillBadge } from '../components/ui/Badge';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Trophy, ArrowLeft } from 'lucide-react';

interface SessionSummaryProps {
  onBackToHome: () => void;
  onBackToSession: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  onBackToHome,
  onBackToSession,
}) => {
  const { session, participants, matches, courts } = useSession();
  const [sortBy, setSortBy] = useState<'winRate' | 'wins' | 'games'>('winRate');
  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-xs text-slate-500 font-bold">Loading session summary...</p>
      </div>
    );
  }

  const activePlayers = participants.filter((p) => p.gamesPlayed > 0);

  const sortedPlayers = [...activePlayers].sort((a, b) => {
    if (sortBy === 'winRate') {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    }
    if (sortBy === 'wins') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.winRate - a.winRate;
    }
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    return b.wins - a.wins;
  });

  const completedMatches = matches.filter((m) => m.status === 'completed');
  const totalGames = completedMatches.length;
  const avgGameSeconds =
    totalGames > 0
      ? Math.round(
          completedMatches.reduce((acc, m) => acc + (m.durationSeconds || 600), 0) / totalGames
        )
      : 600;
  const avgGameMins = Math.round(avgGameSeconds / 60);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 pb-safe">
      {/* Top Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBackToSession}
            className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-2xl clay-btn clay-btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Court</span>
          </button>

          <div className="flex items-center gap-2.5">
            <BrandLogo size="xs" />
            <div className="text-left">
              <h1 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">Session Standings</h1>
              <p className="text-[10px] text-slate-500 font-bold">{session.name}</p>
            </div>
          </div>

          <button
            onClick={onBackToHome}
            className="px-4 py-2 rounded-2xl clay-btn clay-btn-primary text-xs font-black"
          >
            Done
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Podium Highlight (Top 3) */}
        {sortedPlayers.length >= 3 && (
          <div className="clay-card-dark text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="text-center mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Session Podium
              </span>
              <h2 className="text-2xl font-black text-white mt-0.5">Top Performers</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-lg mx-auto text-center">
              {/* 2nd Place */}
              <div className="clay-subcard bg-slate-800 text-white rounded-2xl p-3 sm:p-4 flex flex-col items-center border border-slate-700">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-600 text-slate-100 flex items-center justify-center font-black text-xs sm:text-sm mb-1.5">
                  2
                </div>
                <span className="font-black text-xs sm:text-sm truncate max-w-full text-slate-100">
                  {sortedPlayers[1]?.name}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-black mt-0.5">
                  {sortedPlayers[1]?.winRate}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {sortedPlayers[1]?.wins}W
                </span>
              </div>

              {/* 1st Place */}
              <div className="bg-gradient-to-t from-emerald-900/80 to-emerald-700/60 rounded-3xl p-4 sm:p-5 border-2 border-emerald-400 flex flex-col items-center -mt-3 shadow-xl">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-base sm:text-lg mb-1.5 shadow-md">
                  <Trophy className="w-6 h-6 text-slate-950" />
                </div>
                <span className="font-black text-sm sm:text-base truncate max-w-full text-white">
                  {sortedPlayers[0]?.name}
                </span>
                <span className="text-sm font-mono text-emerald-300 font-black mt-0.5">
                  {sortedPlayers[0]?.winRate}%
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-200 font-semibold">
                  {sortedPlayers[0]?.wins}W ({sortedPlayers[0]?.gamesPlayed}G)
                </span>
              </div>

              {/* 3rd Place */}
              <div className="clay-subcard bg-slate-800 text-white rounded-2xl p-3 sm:p-4 flex flex-col items-center border border-slate-700">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center font-black text-xs sm:text-sm mb-1.5">
                  3
                </div>
                <span className="font-black text-xs sm:text-sm truncate max-w-full text-slate-100">
                  {sortedPlayers[2]?.name}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-black mt-0.5">
                  {sortedPlayers[2]?.winRate}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {sortedPlayers[2]?.wins}W
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="clay-card rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Total Matches
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{totalGames}</span>
          </div>
          <div className="clay-card rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Players
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{participants.length}</span>
          </div>
          <div className="clay-card rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Avg Game
            </span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-0.5 block">~{avgGameMins}m</span>
          </div>
          <div className="clay-card rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Courts
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{courts.length}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex clay-inset rounded-2xl p-1 max-w-xs mx-auto text-xs font-black">
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 py-2 rounded-xl transition-all clay-btn ${
              activeTab === 'standings' ? 'clay-btn-secondary text-slate-900' : 'text-slate-600'
            }`}
          >
            Standings
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-2 rounded-xl transition-all clay-btn ${
              activeTab === 'matches' ? 'clay-btn-secondary text-slate-900' : 'text-slate-600'
            }`}
          >
            Matches ({completedMatches.length})
          </button>
        </div>

        {/* Tab 1: Standings */}
        {activeTab === 'standings' && (
          <div className="clay-card rounded-3xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm">Player Leaderboard</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-bold hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="clay-inset rounded-xl px-2.5 py-1 text-slate-800 font-bold focus:outline-hidden text-xs"
                >
                  <option value="winRate">Win Rate (%)</option>
                  <option value="wins">Total Wins</option>
                  <option value="games">Games Played</option>
                </select>
              </div>
            </div>

            {/* MOBILE VIEW (< 768px): Tactile Player Standings Cards */}
            <div className="block md:hidden p-4 space-y-3">
              {sortedPlayers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No matches completed yet in this session.
                </div>
              ) : (
                sortedPlayers.map((p, idx) => (
                  <div key={p.participantId} className="clay-subcard rounded-2xl p-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm font-mono w-7 text-center">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                      </div>
                      <span className="font-black font-mono text-emerald-700 text-sm">
                        {p.winRate}% <span className="text-[10px] text-slate-400 font-normal">Win</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                      <SkillBadge skill={p.skillLevel} />
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {p.gamesPlayed} Games ({p.wins}W / {p.losses}L)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP VIEW (>= 768px): Structured Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Skill</th>
                    <th className="py-3 px-4">Games</th>
                    <th className="py-3 px-4">Wins</th>
                    <th className="py-3 px-4">Losses</th>
                    <th className="py-3 px-4 text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {sortedPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                        No matches completed yet in this session.
                      </td>
                    </tr>
                  ) : (
                    sortedPlayers.map((p, idx) => (
                      <tr key={p.participantId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-black font-mono text-slate-900">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4">
                          <SkillBadge skill={p.skillLevel} />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">{p.gamesPlayed}</td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">{p.wins}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.losses}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {p.winRate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Match Records */}
        {activeTab === 'matches' && (
          <div className="space-y-3">
            {completedMatches.length === 0 ? (
              <div className="clay-card p-10 rounded-3xl text-center text-xs text-slate-400 font-medium">
                No completed matches recorded yet.
              </div>
            ) : (
              completedMatches.map((m, idx) => {
                const getNames = (ids: string[]) =>
                  ids
                    .map((id) => participants.find((p) => p.participantId === id)?.name || 'Player')
                    .join(' & ');

                const teamANames = getNames(m.teamA);
                const teamBNames = getNames(m.teamB);
                const isAWinner = m.winningTeam === 'teamA';

                return (
                  <div
                    key={m.matchId}
                    className="clay-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black text-slate-400">#{idx + 1}</span>
                      <div>
                        <span className="font-black text-xs text-slate-900">{m.courtName}</span>
                        <div className="text-xs mt-1 font-medium">
                          <span className={isAWinner ? 'font-black text-emerald-700' : 'text-slate-600'}>
                            {teamANames} {isAWinner && '★'}
                          </span>
                          <span className="text-slate-400 mx-2">vs</span>
                          <span className={!isAWinner ? 'font-black text-emerald-700' : 'text-slate-600'}>
                            {teamBNames} {!isAWinner && '★'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono self-end sm:self-center">
                      {m.score && (
                        <span className="px-3 py-1 clay-inset rounded-xl font-black text-slate-900">
                          {m.score.teamA} - {m.score.teamB}
                        </span>
                      )}
                      <span className="text-slate-400 font-semibold">{Math.round((m.durationSeconds || 600) / 60)} min</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};
